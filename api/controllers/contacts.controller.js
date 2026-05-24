const axios = require('axios');
const Instance = require('../models/instance.model')
const mongoose = require('mongoose');
const { Message } = require('../models/chats.model');
const { Contact , ContactAgent} = require('../models/contact.model');
const { emitToInstance } = require('../middlewares/socket');
const User = require('../models/users.model');

// exports.getContact = async(req, res)=>{
//     try {
//       let query = {};
//       const { page, limit, searchtext, filter} = req.query;
//       const instanceId = req.user.instance_id;

//       query = {instanceId};
      
//       if (searchtext) {
//         query.$or = [
//           { name: { $regex: new RegExp(searchtext, 'i') } },
//           { number: { $regex: new RegExp(searchtext, 'i') } }
//         ];
//       }

//       if(filter === 'pinned'){
//         query.isPinned = true
//       }
      
//       // const Contacts = await Contact.find(query)
//       //   .skip((page - 1) * limit)
//       //   .sort({updatedAt : -1})
//       //   .limit(limit);

//       const pipeline = [
//         { $match: query },
//         {
//           $lookup: {
//             from: "chats",
//             localField: "number",
//             foreignField: "number",
//             let: { contactNumber: "$number" },
//             pipeline: [
//               {
//                 $match: {
//                   $expr: { $eq: ["$instanceId", instanceId] },
//                   fromMe: false,
//                 }
//               },
//               {
//                 $count: "unreadMessages"
//               }
//             ],
//             as: "unreadMessages"
//           }
//         },
//         {
//           $addFields: {
//             unreadMessages: { $ifNull: [{ $arrayElemAt: ["$unreadMessages.unreadMessages", 0] }, 0] }
//           }
//         }
//       ];

//       if (filter === "unread") {
//         pipeline.push({ $match: { unreadMessages: { $gt: 0 } } });
//       }

//       const totalContacts = await Contact.aggregate([...pipeline, { $count: "total" }]);
//       const total = totalContacts.length > 0 ? totalContacts[0].total : 0;
      
//       pipeline.push({ $sort: { updatedAt: -1 } });
//       pipeline.push({ $skip: (page - 1) * limit });
//       pipeline.push({ $limit: parseInt(limit) });

//       const contacts = await Contact.aggregate(pipeline);

//       return res.status(200).json({data: contacts, total});

//       } catch (error) {
//         return res.status(500).send({ error: error.message });
//       }
// }

exports.getContact = async (req, res) => {
  try {
    const { page = 1, limit = 10, searchtext, filter } = req.query;
    const {numberId, userId} = req.user;
    const agentId = new mongoose.Types.ObjectId(userId)
    let matchStage = { numberId };

    if (filter === "pinned") {
      matchStage.isPinned = true;
    }


console.log('matchStage', matchStage);

    const pipeline = [
      { $match: matchStage }, // Match contacts assigned to the agent
      {
        $lookup: {
          from: "messages",
          localField: "number",
          foreignField: "number",
          let: { contactNumber: "$number" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$numberId", numberId] },
                fromMe: false
              }
            },
            {
              $addFields: {
                isUnread: {
                  $not: {
                    $in: ["4", "$messageStatus.status"] // Check if status 4 (read) is NOT in the array
                  }
                }
              }
            },
            { $match: { isUnread: true } }, // Keep only unread messages
            { $count: "unreadMessages" } // Count unread messages per contact
          ],
          as: "unreadMessages"
        }
      },
      {
        $addFields: {
          unreadMessages: { $ifNull: [{ $arrayElemAt: ["$unreadMessages.unreadMessages", 0] }, 0] }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          pushName: 1,
          number: 1,
          lastMessage: 1,
          lastMessageAt: 1,
          instanceId: 1,
          isPinned: 1,
          unreadMessages: 1,
          createdAt: 1,
          updatedAt: 1,
        }
      }
    ];

    if (searchtext) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: new RegExp(searchtext, "i") } },
            { number: { $regex: new RegExp(searchtext, "i") } }
          ]
        }
      });
    }

    if (filter === "unread") {
      pipeline.push({ $match: { unreadMessages: { $gt: 0 } } });
    }

    // Pagination
    const totalContacts = await Contact.aggregate([...pipeline, { $count: "total" }]);
    const total = totalContacts.length > 0 ? totalContacts[0].total : 0;

    pipeline.push({ $sort: { lastMessageAt: -1 } });
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: parseInt(limit) });

    console.log('pipeline', pipeline)
    const contacts = await Contact.aggregate(pipeline);

    return res.status(200).json({ data: contacts, total });

  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
};

exports.saveContact = async(req, res)=>{
    try {
        console.log(req.user)
        const numberId = req.user.numberId;
        const userId = req.user.userId;
        const user = req.user;

        const { number, name } = req.body;

        if (!number || !numberId) {
            return res.status(400).send({ message: 'Number and numberId are required' });
        }

        const ifExist = await Contact.findOne({
            numberId, 
            $or: [
              { number: number }, 
              { name: name }
            ]
          });
        if(ifExist) return res.status(400).json({message: 'Number already in use'})

        const newContact = new Contact(req.body);
        newContact.pushName = name;
        newContact.numberId = numberId;
        await newContact.save();

        if (user.role === 'admin') {
          await ContactAgent.create({
              contactId: newContact._id,
              agentId: userId,
              numberId,
              role: 'admin'
          });
      } else if (user.role === 'agent') {
          // Find admin for the same instance
          const adminUser = await User.findOne({ instanceId, role: 'admin' });

          if (adminUser) {
              // Create ContactAgent for agent
              await ContactAgent.create({
                  contactId: newContact._id,
                  agentId: userId,
                  numberId,
                  role: 'agent'
              });

              // Create ContactAgent for admin
              await ContactAgent.create({
                  contactId: newContact._id,
                  agentId: adminUser._id,
                  numberId,
                  role: 'admin'
              });
          }
      }

        return res.status(201).send({ message: 'Contact created', contact: newContact });

      } catch (error) {
        // console.log(error)
        return res.status(500).send({ error: error.message });
      }
}

exports.updateContacts = async(req, res)=>{
    try {
        const { id } = req.params;
        const contact = await Contact.findByIdAndUpdate(id, req.body, { new: true });
        if (!contact) {
          return res.status(404).send({ message: 'Contact not found' });
        }
        res.status(200).send(contact);
      } catch (error) {
        // console.log(error)
        return res.status(500).send({ error: error.message });
      }
}

exports.deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await Contact.findById(id);
        if (!contact) {
            return res.status(404).json({ message: "Contact not found" });
        }
        await Message.deleteMany({ number: contact.number, numberId: contact.instanceId });
        await Contact.findByIdAndDelete(id);

        res.status(200).json({ message: "Contact and related messages deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getMessages = async (req, res)=>{
    try {
        const {senderNumber, limit = 20, offset = 0 } = req.body;
        
        const {numberId} = req.user

        const messages = await Message.find({ 
          number: ''+ senderNumber,
          numberId
         }).sort({ createdAt: -1 })
         .skip(offset * limit)
         .limit(limit);

         const count = await Message.countDocuments({
          number: ''+ senderNumber,
          numberId
         })
        res.status(200).send({messages,count});
      } catch (error) {
        // console.log(error)
        return res.status(500).send({ error: error.message });
      }
}

exports.sendMessageOld = async(req, res)=>{
try {
    const { number, message, type, media_url } = req.body;
    const numberId = req.user.numberId
    const userId = req.user.userId
    if (!number || !(message || media_url)) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const messageData = {
        number,
        numberId: numberId,
        message,
        type: "text"
    };

    if(media_url){
      messageData['type'] = type
      messageData['media_url']= media_url
    }

    console.log('messageData', messageData)
    const API_URL = process.env.LOGIN_CB_API

    const response = await axios.get(`${API_URL}/send`, {
        params: { ...messageData, access_token: ACCESS_TOKEN },
    });

    console.log('response', response.data)
    
    if (response.data.status !== "success") {
        return res.status(500).json({ error: "Failed to send message", details: response.data });
    }
    let messageId= response.data?.message?.key?.id
    
    // const newChat = new Message({
    //     number,
    //     fromMe: true,
    //     instanceId,
    //     messageStatus: [{ status: 1, time: new Date() }],
    //     message,
    //     type: type || "text",
    //     timeStamp: new Date(),
    //     mediaUrl: media_url || "",
    //     messageId: response.data?.message?.key?.id || "",
    // });
    
    const newMessage = await Message.findOneAndUpdate(
            {messageId},
            { 
                $set: {
                    number,
                    fromMe: true,
                    instanceId,
                    message,
                    messageStatus: [{ status: 1, time: new Date() }],
                    type: type || "text",
                    mediaUrl: media_url || "",
                    sentBy: req.user.role,
                    sendByName: req.user.name,
                    sentById: userId
                }
            },
            { new: true, upsert: true }
        ); 
//     await newChat.save();

    // console.log(number)

    // const contact = await Contact.findOneAndUpdate(
    //     { number , instanceId},
    //     {
    //       $set: {
    //         lastMessage: message,
    //         lastMessageAt: new Date(),
    //         updatedAt: new Date()
    //       }
    //     },
    //     { new: true, upsert: true }
    //   );

    //   console.log(contact)
    return res.status(200).json({ success: true, message: "Message sent successfully"});
    } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}

exports.sendMessage = async (req, res) => {
  try {
    const { number, message, type = "text", media_url, caption, filename } = req.body;
    const numberId = req.user.numberId; // phone_number_id from Instance
    const userId = req.user.userId;
    
    const instance = await Instance.findOne({numberId})

    if (!number || (!message && !media_url)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Build payload for WhatsApp Cloud API
    let payload = {
      messaging_product: "whatsapp",
      to: number,
      type,
    };

    if (type === "text") {
      payload.text = { body: message };
    } else if (["image", "video", "audio", "document"].includes(type)) {
      payload[type] = {
        link: media_url,
      };
      if (type === "document" && filename) {
        payload[type].filename = filename;
      }
      if (caption) payload[type].caption = caption;
    } else {
      return res.status(400).json({ error: "Unsupported message type" });
    }

    console.log("📤 Sending payload:", JSON.stringify(payload, null, 2));

    // Call WhatsApp Cloud API
    const response = await axios.post(
      `${process.env.FB_API}/${numberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${instance.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ WhatsApp response:", response.data);

    const messageId = response.data.messages?.[0]?.id || null;

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
          sentBy: req.user.role,
          sendByName: req.user.name,
          sentById: userId,
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

    return res.status(200).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error(
      "❌ Error sending message:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.response?.data || error.message,
    });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { number } = req.body;
    const instanceId = req.user.instanceId; // Assuming authentication middleware sets user instance ID

    if (!number) {
      return res.status(400).json({ error: "Number is required" });
    }

    const filter = {
      number,
      instanceId,
      fromMe: false,
      "messageStatus.status": { $ne: "4" } // Find messages where status ≠ '4'
    };

    const update = {
      $push: {
        messageStatus: {
          status: "4",
          time: new Date() // Add current timestamp
        }
      }
    };

    const result = await Message.updateMany(filter, update);

    return res.status(200).json({
      message: "Messages marked as read",
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.uploadFile = (req, res) => {
  if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
  }

  res.json({
      message: 'File uploaded successfully!',
      fileName: req.file.filename,
      filePath: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype
  });
};

exports.assignUser = async (req, res)=>{
  try {
    const { contactId, agentId, isPinned } = req.body;
    const numberId = req.user.numberId;

    if (!contactId || !Array.isArray(agentId) || agentId.length === 0 ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingAssignments = await ContactAgent.find({ contactId, numberId, role: 'agent' });

    const existingAgentIds = existingAssignments.map(doc => doc.agentId.toString());

    const agentsToAdd = agentId.filter(id => !existingAgentIds.includes(id));

    const agentsToRemove = existingAgentIds.filter(id => !agentId.includes(id));

    if (agentsToRemove.length > 0) {
      await ContactAgent.deleteMany({
        contactId,
        numberId,
        agentId: { $in: agentsToRemove }
      });
    }

    const newAssignments = agentsToAdd.map(agentId => ({
      contactId,
      agentId,
      numberId,
      role: 'agent',
      isPinned: isPinned ?? false
    }));

    if (newAssignments.length > 0) {
      await ContactAgent.insertMany(newAssignments);
    }

    const updatedAssignments = await ContactAgent.find({ contactId, numberId, role: 'agent'  });

    agentsToAdd.forEach(agentId => {
      emitToInstance(agentId, "contactUpdated", { contactId });
    });

    return res.status(200).json({ success: true, data: updatedAssignments });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

exports.getAssignedUser = async (req, res)=>{
  try {
    const { contactId } = req.params;
    const numberId = req.user.numberId;
    console.log(req.user)

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({ error: "Invalid contactId" });
    }

    const contactAgents = await ContactAgent.find({ contactId, numberId, role: 'agent' })
      .populate("agentId", "name _id role")
      .populate("contactId", "name number role");

    if (!contactAgents.length) {
      return res.status(404).json({ error: "No contact agents found" });
    }

    return res.status(200).json({ success: true, data: contactAgents });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

exports.unlinkContact = async (req, res)=>{
  try {
    const { contactId } = req.params;
    const agentId = req.user.userId
    
    if (!contactId || !agentId) {
      return res.status(400).json({ error: "Missing required fields" });
    };

    const deletedEntry = await ContactAgent.findOneAndDelete({ contactId, agentId });

    if (!deletedEntry) {
      return res.status(404).json({ error: "No matching entry found" });
    }

    return res.status(200).json({ success: true, message: "Contact unlinked successfully" });

  } catch (error){
    return res.status(500).json({ error: error.message });
  }
}

exports.togglePinContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const agentId = req.user.userId;

    if (!contactId || !agentId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const contactAgent = await ContactAgent.findOne({ contactId, agentId });

    if (!contactAgent) {
      return res.status(404).json({ error: "No matching entry found" });
    }

    contactAgent.isPinned = !contactAgent.isPinned;
    await contactAgent.save();

    return res.status(200).json({
      success: true,
      message: `Contact ${contactAgent.isPinned ? "pinned" : "unpinned"} successfully`,
      data: contactAgent
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const sendMessageFunc = async (message, data={})=>{
console.log(message)
const instance = await Instance.findOne({
    instance_id: message.instance_id
}).sort({ updatedAt: -1 })

const contact = await Contact.findOne({number: message.number, eventId: instance?.eventId.toString()});
message.message = reformText(message?.message, {contact})

const url = process.env.LOGIN_CB_API
const access_token = process.env.ACCESS_TOKEN_CB
if(message?.media_url){
    const newMessage = {
    ...message,
    senderNumber: message?.number,
    instanceId: message?.instance_id,
    fromMe: true,
    text: message?.message,
    media_url: message?.media_url,
    eventId: instance?.eventId
    }
    const savedMessage = new Message(newMessage);
    await savedMessage.save();
}

// console.log('aaaa',newMessage)

const response = await axios.get(`${url}/send`,{params:{...message,access_token}})
return true;
}