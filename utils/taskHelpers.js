// utils/taskHelpers.js

/**
 * Calculate task reward for display based on user tier.
 * @param {Object} task - Task object { reward, earn_multiplier, type }
 * @param {Object} user - User object { tier }
 * @returns {Object} { rewardValue, displayText }
 */
export const getTaskRewardDisplay = (task, user) => {
  const isPremiumUser = user?.tier === 'premium';
  const baseReward = task.reward || 0;
  const multiplier = task.earn_multiplier || 1;

  // Final reward
  const rewardValue = isPremiumUser ? baseReward * multiplier : baseReward;

  // Display text
  let displayText = `${rewardValue}`;
  if (!isPremiumUser && task.type === 'premium') {
    displayText += ' (Earn ×10 as Premium ★)';
  } else if (isPremiumUser && multiplier > 1) {
    displayText += ` (×${multiplier})`;
  }

  return { rewardValue, displayText };
};
