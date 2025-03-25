const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  amountRequired: {
    type: Number,
    required: true,
    unique: true, // Each threshold amount should be unique
  },
  rewardName: {
    type: String,
    required: true,
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

const Reward = mongoose.model('Reward', rewardSchema);
module.exports = Reward;
