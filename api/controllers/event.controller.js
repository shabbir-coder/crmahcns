const Instance = require('../models/instance.model')
const mongoose = require('mongoose');
const { Message, File } = require('../models/chats.model');
const { Contact, ContactAgent } = require('../models/contact.model');
const { emitToInstance } = require('../middlewares/socket');
const User = require('../models/users.model')
const axios = require('axios');

exports.handleEvent= async(req,res)=>{
    try {
        const { instance_id, data } = req.body;
        if (!data || !data.event) return res.status(400).send({ error: 'Invalid request' });
        const io = req.io;

        switch (data.event) {
            case 'messages.upsert':
                await handleMessageUpsert(data.data, instance_id);
                break;
            case 'messages.update':
                await handleMessageUpdate(data.data, instance_id);
                break;
            default:
                console.log("Unknown event received:", data.event);
        }

        res.status(200).send({ message: 'Event processed successfully' });
    } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}

// Function to handle new contacts update
const handleContactUpdate = async (contacts, instanceId) => {
    if (!Array.isArray(contacts)) return;
    for (const contact of contacts) {
        const { id, notify } = contact;
        const number = id.replace('@s.whatsapp.net', ''); 

        const existingContact = await Contact.findOne({ number });

        if (!existingContact) {
            await Contact.create({
                pushName: notify || 'Unknown',
                number,
                instanceId
            });
        }
        // Emit event to update contact list in frontend
        emitToInstance(instanceId, "contactUpdated", existingContact);
    }
};

// Function to handle incoming messages
const handleMessageUpsert = async (message, numberId) => {
  try {
    if (!message) return;

    console.log("➡️ Processing new message:", message);

    const number = `+${message.from}`; // Ensure + prefix
    const messageId = message.id;
    const timeStamp = new Date(parseInt(message.timestamp) * 1000);
    const type = message.type;
    const fromMe = false;
    const textMessage = message?.text?.body || "";

    let fileData = null;
    let locationUrl = null;

    // ================================
    // HANDLE MEDIA
    // ================================
    if (["image", "video", "audio", "document", "sticker"].includes(type)) {
      try {
        fileData = await saveFileData(message);
      } catch (err) {
        console.error("❌ Error saving media file:", err);
      }
    }

    // ================================
    // HANDLE LOCATION
    // ================================
    if (type === "location" && message.location) {
      const { latitude, longitude } = message.location;
      locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    }

    const pushName = message?.profile?.name || "Unknown";

    const updateFields = {
      lastMessage:
        textMessage ||
        locationUrl ||
        fileData?.caption ||
        fileData?.filetype ||
        "",
      lastMessageAt: timeStamp,
      pushName,
      numberId,
    };

    const contact = await Contact.findOneAndUpdate(
      { number, numberId },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    // ================================
    // ASSIGN DEFAULT ADMIN IF NEEDED
    // ================================
    let receivers = await ContactAgent.find({
      contactId: contact?._id,
      numberId,
    });

    if (!receivers.length) {
      const admin = await User.findOne({ role: "admin", numberId });
      if (admin) {
        const newReceiver = await ContactAgent.create({
          contactId: contact?._id,
          agentId: admin._id,
          numberId,
          role: "admin",
        });
        receivers = [newReceiver];
      }
    }

    // ================================
    // STORE MESSAGE
    // ================================
    const newMessage = await Message.findOneAndUpdate(
      { messageId },
      {
        $set: {
          number,
          fromMe,
          numberId,
          message: textMessage || locationUrl || fileData?.caption || "",
          messageId,
          timeStamp,
          messageStatus: [{ status: "3", time: new Date() }],
          type: fileData ? "media" : type,
          fileType: fileData?.filetype,
          mimetype: fileData?.mimetype,
          fileSize: fileData?.fileLength,
          fileLength: fileData?.seconds,
          fileId: fileData?._id,
          mediaUrl: fileData?.url,
          mediaOriginalName: fileData?.mediaName,
          sentBy: "customer",
          sendByName: pushName,
          sentById: contact?._id,
        },
      },
      { new: true, upsert: true }
    );

    // ================================
    // EMIT SOCKET EVENTS
    // ================================
    await Promise.all(
      receivers.map(async (receiver) => {
        emitToInstance(receiver?.agentId, "message-" + number, newMessage);
        emitToInstance(receiver?.agentId, "contactUpdated", contact);
      })
    );

    // ================================
    // PREPARE LLM PAYLOAD (JSON BODY)
    // ================================
    const payload = {
      user_message: textMessage || locationUrl || "",
      chatbot_id: number,
      phone_number: number,
      business_info: {
        name: "Al Hutaib Computers & Network Solutions LLC",
        description: "",
        working_hours: "9AM - 6PM",
        working_days: "Monday - Saturday",
      },
      chatbot_info: {
        tone: "Professional",
        language: "english",
        name: "",
      },
    };

    if (fileData) {
      payload.is_file = true;

      if (fileData.filetype === "audio") {
        payload.file_type = "audio";
      } else if (fileData.filetype === "document") {
        payload.file_type = "document";
      } else {
        payload.file_type = "file";
      }

      payload.file_path = fileData.url;
    }

    console.log("📤 Sending to AI:", payload);

    // ================================
    // CALL LLM API (CORRECT FORMAT)
    // ================================
    try {
      aiResponse = await axios.post(
        `${process.env.LLM_API}/api/v1/chat`,
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("❌ Error calling AI service:", err.response?.data || err);
      const aiError = err.response?.data?.message || err.message || "Unknown error";
      await sendMessage(number, `❌Error: ${aiError}`, numberId);
      return;
    }

    const data = aiResponse.data;
    console.log("🤖 AI Response:", data);

    if (data.status !== "success") return;

    // ================================
    // SEND RESPONSE BACK TO WHATSAPP
    // ================================
    await sendMessage(number, data.response, numberId);

    // If image URLs are returned
    if (data.image_urls?.length) {
      for (const img of data.image_urls) {
        await sendMediaMessage(
          number,
          {
            type: "image",
            link: img,
          },
          numberId
        );
      }
    }

  } catch (err) {
    console.error("🔥 Error in handleMessageUpsert:", err.response?.data || err);
  }
};


const sendMessage = async (number, message, numberId, type = 'text', media_url = '', filename = '') => {
    let payload = {
      messaging_product: "whatsapp",
      to: number,
      type,
    };

    if (type === "text") {
      payload.text = { body: message };
    // } else if (["image", "video", "audio", "document"].includes(type)) {
    //   payload[type] = {
    //     link: media_url,
    //     filename: filename
    //   };
    //   if (caption) payload[type].caption = caption;
    // } else {
    //   return res.status(400).json({ error: "Unsupported message type" });
    }

    console.log("📤 Sending payload:", JSON.stringify(payload, null, 2));

    // Call WhatsApp Cloud API
    const response = await axios.post(
      `${process.env.FB_API}/${numberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );


    const messageId = response.data.messages?.[0]?.id || null;

    const admin = await User.findOne({ role: "admin", numberId });

    // Save message in DB
    const newMessage = await Message.findOneAndUpdate(
      { messageId },
      {
        $set: {
          number,
          fromMe: true,
          numberId,
          message: message || caption || "",
          messageId,
          messageStatus: [{ status: "sent", time: new Date() }],
          type: type ==='text'?'text':'media',
          fileType: type,
          mediaUrl: media_url || "",
          mediaOriginalName: filename,
          sentBy: 'Admin',
          sendByName: 'Admin',
          sentById: admin._id,
          timeStamp: new Date(),
        },
      },
      { new: true, upsert: true }
    );
    
     const updateFields = {
      lastMessage: message || caption || `${type} : ${filename}` || "",
      lastMessageAt: new Date(),
    };
    
    const contact = await Contact.findOneAndUpdate(
      { number, numberId },
      { $set: updateFields },
      { new: true }
     );
     let receivers = await ContactAgent.find({ contactId: contact?._id, numberId });
    if (!receivers.length) {
      const admin = await User.findOne({ role: "admin", numberId });
      if (admin) {
        const newReceiver = await ContactAgent.create({
          contactId: contact?._id,
          agentId: admin._id,
          numberId,
          role: "admin",
        });
        receivers = [newReceiver];
      }
    }
    
    await Promise.all(
      receivers.map(async (receiver) => {
        emitToInstance(receiver?.agentId, "message-" + number, newMessage);
        emitToInstance(receiver?.agentId, "contactUpdated", contact);
      })
    );
};

// Function to update message statuses (Cloud API)
const handleMessageUpdate = async (statuses, numberId) => {
  if (!Array.isArray(statuses)) return;

  console.log("📡 Processing message status updates");

  for (const statusObj of statuses) {
    const messageId = statusObj.id;
    const status = statusObj.status;
    const recipient = statusObj.recipient_id;
    const timeStamp = new Date(parseInt(statusObj.timestamp) * 1000);

    await Message.updateOne(
      { messageId },
      { $push: { messageStatus: { status, time: timeStamp } } }
    );

    // Emit event for message status update
    emitToInstance(numberId, "messageStatus-" + recipient, {
      messageId,
      status,
      time: timeStamp,
    });
  }
};

const saveFileData = async (message) => {
  try {
    const type = message.type; // image, video, audio, document, sticker
    const media = message[type];
    if (!media?.id) {
      console.warn("⚠️ No media ID found in message");
      return null;
    }

    const mediaId = media.id;
    const accessToken = process.env.WHATSAPP_TOKEN;

    // Step 1: Fetch media metadata
    const metaRes = await axios.get(
      `${process.env.FB_API}/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const meta = metaRes.data;
    console.log("📂 Media metadata:", meta);

    // Step 2: Download actual media
    const fileRes = await axios.get(meta.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: "arraybuffer",
    });

    const buffer = Buffer.from(fileRes.data, "binary");

    // Step 3: Save buffer locally
    const fs = require("fs");
    const path = require("path");
    const uploadsDir = path.join(__dirname, "../../uploads/downloads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const extension = meta.mime_type.split("/")[1] || "bin";
    const fileName = `${mediaId}.${extension}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Step 4: Build URL for serving
    const fileUrl = `${process.env.IMAGE_URL}uploads/downloads/${fileName}`;

    // Step 5: Map fileSchema fields properly
    const fileData = {
      url: fileUrl,
      mediaName: message?.document?.filename || 'file-'+fileName,
      mimetype: meta.mime_type,
      filetype: type,
      caption: media.caption || null,
      fileSha256: meta.sha256,
      fileLength: meta.file_size || buffer.length,
      path: filePath,
      jpegThumbnail: media?.jpeg_thumbnail || null, // if WhatsApp provides it
      mediaKey: media?.media_key || null,
      fileEncSha256: media?.file_enc_sha256 || null,
      mediaKeyTimestamp: media?.media_key_timestamp || null,
      height: media?.height || null,
      width: media?.width || null,
      seconds: media?.seconds || null,
      streamingSidecar: media?.streaming_sidecar || null,
      contextInfo: media?.context_info || null,
    };

    console.log("📝 fileData to save:", fileData);

    const savedFile = await File.create(fileData);
    console.log("✅ File saved:", savedFile);

    return savedFile;
  } catch (error) {
    console.error("❌ Error saving file data:", error?.response?.data || error);
    return null;
  }
};

exports.getEventWebhook = async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WP_VERIFY_TOKEN; 
  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      // Respond with '403 Forbidden' if verify tokens do not match
      return res.sendStatus(403);
    }
  }else{
      return res.status(400).send({message:'No token or mode found'})
  }
};

exports.postEventWebhook = async (req, res) => {
  try {
    const body = req.body;

    // Log the request body safely
    console.log("📩 Received webhook event:", JSON.stringify(body));

    // Validate object type
    if (body?.object !== "whatsapp_business_account") {
      return res.status(400).json({ message: "Invalid webhook object type" });
    }

    // Process entries
    for (const entry of body.entry || []) {
      const changes = entry?.changes || [];

      for (const change of changes) {
        const value = change?.value || {};
        const messages = value?.messages || [];
        const statuses = value?.statuses || [];
        const number = value?.metadata?.display_phone_number;
        const numberId = value?.metadata?.phone_number_id;
        const contacts = value?.contacts || [];

        // Process incoming messages
        for (const message of messages) {
          const contact = contacts.find(c => c.wa_id === message.from) || null;
          console.log("💬 New message received:", message);
          try {
            await handleMessageUpsert({...message, ...contact}, numberId);
          } catch (err) {
            console.error("❌ Error handling message upsert:", err);
          }
        }

        // Process status updates
        for (const status of statuses) {
          console.log("📡 New status update received:", status);
          try {
            await handleMessageUpdate(status, numberId);
          } catch (err) {
            console.error("❌ Error handling status update:", err);
          }
        }
      }
    }

    return res.status(200).json({ message: "Event processed successfully" });
  } catch (error) {
    console.error("🔥 Webhook processing failed:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
