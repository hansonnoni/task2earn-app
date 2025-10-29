// utils/userBalance.js
import { supabase } from '../supabase';

// 🔹 Fetch user balance + currency symbol
export const getUserBalance = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('balance, currency_symbol')
    .eq('id', userId)
    .single();

  if (error) {
    console.error("Error fetching balance:", error.message);
    return null;
  }

  return data; // { balance: 500, currency_symbol: "₦" }
};

// 🔹 Update balance when user earns or spends
export const updateBalance = async (userId, amountToAdd) => {
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('balance')
    .eq('id', userId)
    .single();

  if (fetchError) throw fetchError;

  const newBalance = parseFloat(user.balance) + parseFloat(amountToAdd);

  const { error: updateError } = await supabase
    .from('users')
    .update({ balance: newBalance })
    .eq('id', userId);

  if (updateError) throw updateError;

  return newBalance;
};
