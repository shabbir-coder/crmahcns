const axios = require('axios');
const Instance = require('../models/instance.model')
const mongoose = require('mongoose');
const { Message } = require('../models/chats.model');
const { Contact, List } = require('../models/contact.model');

exports.createList = async (req, res) => {
    try {
      const { name, description, contacts } = req.body;
      
      const instanceId = req.user.instance_id

      const list = new List({ name, description, contacts, instanceId });
      await list.save();
  
      return res.status(201).json({ success: true, message: 'List created successfully', list });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  exports.getLists = async (req, res) => {
    try {
      const instanceId = req.user.instance_id
      const data = await List.find({ instanceId }).populate('contacts');
      if(!data.length) return res.status(400).json({ success: false, message: 'No data not found'})
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  exports.getById = async(req, res)=>{
    try {
        const { listId } = req.params
        const list = await List.findOne({_id: listId})

        if(!list) return res.status(404).send({status: false, message:'Not found'})
        return res.status(200).send({status: true, data: list})
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
  }

  exports.updateList = async (req, res) => {
    try {
      const { listId } = req.params;
      const { name, description, contacts } = req.body;
  
      const updatedList = await List.findByIdAndUpdate(
        listId,
        { name, description, contacts },
        { new: true }
      );
  
      if (!updatedList) return res.status(404).json({ error: "List not found" });

      return res.status(200).json({ success: true, message: 'List updated successfully', updatedList });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  exports.deleteList = async (req, res) => {
    try {
      const { listId } = req.params;
      const deletedList = await List.findByIdAndDelete(listId);
      if( !deletedList) res.status(404).send({success: false, message: 'List not found'})
      return res.status(200).json({ success: true, message: 'List deleted successfully' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };