const axios = require('axios');
const Instance = require('../models/instance.model');

// Helper function to get instance credentials
const getInstanceCredentials = async (numberId) => {
  const instance = await Instance.findOne({ numberId });
  if (!instance) {
    throw new Error('Instance not found');
  }
  return {
    accessToken: instance.accessToken,
    businessId: instance.businessId,
    phoneNumberId: numberId
  };
};

// 1. Template Analytics
exports.getTemplateAnalytics = async (req, res) => {
  try {
    const { start, end, granularity = 'DAILY', template_ids } = req.query;
    const numberId = req.user.numberId;

    const { accessToken, businessId } = await getInstanceCredentials(numberId);

    const fields =
      `template_analytics` +
      `.start(${start})` +
      `.end(${end})` +
      `.granularity(${granularity})` +
      (template_ids ? `.template_ids([${template_ids}])` : '');

    const response = await axios.get(
      `${process.env.FB_API}/${businessId}`,
      {
        params: { fields },
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    res.json({ success: true, data: response.data.template_analytics });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error?.response?.data || error.message
    });
  }
};

// 2. Phone Number Analytics
exports.getPhoneAnalytics = async (req, res) => {
  try {
    const { start, end, granularity = 'DAY', phone_numbers } = req.query;
    const numberId = req.user.numberId;

    const { accessToken, businessId } = await getInstanceCredentials(numberId);

    const fields =
      `analytics` +
      `.start(${start})` +
      `.end(${end})` +
      `.granularity(${granularity})` +
      (phone_numbers ? `.phone_numbers([${phone_numbers}])` : '');

    const response = await axios.get(
      `${process.env.FB_API}/${businessId}`,
      {
        params: { fields },
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    res.json({ success: true, data: response.data.analytics });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error?.response?.data || error.message
    });
  }
};

// 3. Conversation Analytics
exports.getConversationAnalytics = async (req, res) => {
  try {
    const {
      start,
      end,
      granularity = 'DAY',
      metric_types,
      conversation_categories,
      conversation_directions,
      phone_numbers,
      dimensions
    } = req.query;

    const numberId = req.user.numberId;
    const { accessToken, businessId } = await getInstanceCredentials(numberId);

    let fields =
      `conversation_analytics` +
      `.start(${start})` +
      `.end(${end})` +
      `.granularity(${granularity})`;

    if (metric_types) fields += `.metric_types([${metric_types}])`;
    if (conversation_categories) fields += `.conversation_categories([${conversation_categories}])`;
    if (conversation_directions) fields += `.conversation_directions([${conversation_directions}])`;
    if (phone_numbers) fields += `.phone_numbers([${phone_numbers}])`;
    if (dimensions) fields += `.dimensions([${dimensions}])`;

    const response = await axios.get(
      `${process.env.FB_API}/${businessId}`,
      {
        params: { fields },
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    res.json({
      success: true,
      data: response.data.conversation_analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error?.response?.data || error.message
    });
  }
};

// 4. Get All Message Templates
exports.getMessageTemplates = async (req, res) => {
  try {
    const numberId = req.user.numberId;
    const { accessToken, businessId } = await getInstanceCredentials(numberId);

    const response = await axios.get(
      `${process.env.FB_API}/${businessId}/message_templates`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    res.json({
      success: true,
      data: response.data.data
    });
  } catch (error) {
    console.error('Get templates error:', error?.response?.data || error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message templates',
      error: error?.response?.data || error.message
    });
  }
};

// 5. Create Message Template
exports.createMessageTemplate = async (req, res) => {
  try {
    const { name, language, category, components } = req.body;
    const numberId = req.user.numberId;
    
    const { accessToken, businessId } = await getInstanceCredentials(numberId);

    const response = await axios.post(
      `${process.env.FB_API}/${businessId}/message_templates`,
      { name, language, category, components },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      message: 'Template created successfully',
      data: response.data
    });
  } catch (error) {
    console.error('Create template error:', error?.response?.data || error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error?.response?.data || error.message
    });
  }
};

// 6. Delete Message Template
exports.deleteMessageTemplate = async (req, res) => {
  try {
    const { templateName } = req.params;
    const numberId = req.user.numberId;
    
    const { accessToken, businessId } = await getInstanceCredentials(numberId);

    await axios.delete(
      `${process.env.FB_API}/${businessId}/message_templates`,
      {
        params: { name: templateName },
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete template error:', error?.response?.data || error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error?.response?.data || error.message
    });
  }
};

// 7. Get Phone Number Quality
exports.getPhoneQuality = async (req, res) => {
  try {
    const numberId = req.user.numberId;
    const { accessToken, phoneNumberId } = await getInstanceCredentials(numberId);

    const response = await axios.get(
      `${process.env.FB_API}/${phoneNumberId}`,
      {
        params: {
          fields: 'quality_rating,messaging_limit_tier,verified_name,display_phone_number'
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Phone quality error:', error?.response?.data || error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch phone quality',
      error: error?.response?.data || error.message
    });
  }
};

// 8. Update Business Profile
exports.updateBusinessProfile = async (req, res) => {
  try {
    const { about, description, vertical } = req.body;
    const numberId = req.user.numberId;
    
    const { accessToken, phoneNumberId } = await getInstanceCredentials(numberId);

    const response = await axios.post(
      `${process.env.FB_API}/${phoneNumberId}/whatsapp_business_profile`,
      {
        messaging_product: 'whatsapp',
        about,
        description,
        vertical
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      message: 'Business profile updated successfully',
      data: response.data
    });
  } catch (error) {
    console.error('Update profile error:', error?.response?.data || error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business profile',
      error: error?.response?.data || error.message
    });
  }
};

// 9. Update Display Name
exports.updateDisplayName = async (req, res) => {
  try {
    const { display_name } = req.body;
    const numberId = req.user.numberId;
    
    const { accessToken, phoneNumberId } = await getInstanceCredentials(numberId);

    const response = await axios.post(
      `${process.env.FB_API}/${phoneNumberId}`,
      { display_name },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      message: 'Display name updated successfully',
      data: response.data
    });
  } catch (error) {
    console.error('Update display name error:', error?.response?.data || error);
    res.status(500).json({
      success: false,
      message: 'Failed to update display name',
      error: error?.response?.data || error.message
    });
  }
};

// 10. Update Profile Photo
exports.updateProfilePhoto = async (req, res) => {
  try {
    const { handle } = req.body; // URL to image
    const numberId = req.user.numberId;
    
    const { accessToken, phoneNumberId } = await getInstanceCredentials(numberId);

    const response = await axios.post(
      `${process.env.FB_API}/${phoneNumberId}/profile_picture`,
      { handle },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: response.data
    });
  } catch (error) {
    console.error('Update profile photo error:', error?.response?.data || error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile photo',
      error: error?.response?.data || error.message
    });
  }
};

// 11. Get Billing Information
exports.getBillingInfo = async (req, res) => {
  try {
    const numberId = req.user.numberId;
    const { accessToken, businessId } = await getInstanceCredentials(numberId);

    const { start, end } = req.query;

    // 1️⃣ WABA metadata
    const wabaInfoReq = axios.get(
      `${process.env.FB_API}/${businessId}`,
      {
        params: { fields: 'currency,timezone_id' },
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    // 2️⃣ Pricing analytics (true billing data)
    const pricingFields =
      `pricing_analytics` +
      `.start(${start})` +
      `.end(${end})` +
      `.granularity(MONTHLY)` +
      `.dimensions(PRICING_CATEGORY,PRICING_TYPE,COUNTRY)`;

    const pricingReq = axios.get(
      `${process.env.FB_API}/${businessId}`,
      {
        params: { fields: pricingFields },
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    // 3️⃣ Conversation cost (fallback if pricing unavailable)
    const conversationFields =
      `conversation_analytics` +
      `.start(${start})` +
      `.end(${end})` +
      `.granularity(DAILY)` +
      `.metric_types(["COST","CONVERSATION"])`;

    const conversationReq = axios.get(
      `${process.env.FB_API}/${businessId}`,
      {
        params: { fields: conversationFields },
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const [wabaInfo, pricingAnalytics, conversationAnalytics] =
      await Promise.all([wabaInfoReq, pricingReq, conversationReq]);

    // Detect BSP billing (COST missing)
    const isBspBilled =
      !conversationAnalytics?.data?.conversation_analytics?.data?.[0]
        ?.data_points?.some(dp => typeof dp.cost === 'number');

    res.json({
      success: true,
      data: {
        currency: wabaInfo.data.currency,
        timezone_id: wabaInfo.data.timezone_id,
        pricing_analytics: pricingAnalytics.data.pricing_analytics || null,
        conversation_analytics: conversationAnalytics.data.conversation_analytics || null,
        is_billed_via_partner: isBspBilled
      }
    });
  } catch (error) {
    console.error('Billing info error:', error?.response?.data || error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing information',
      error: error?.response?.data || error.message
    });
  }
};


module.exports = exports;