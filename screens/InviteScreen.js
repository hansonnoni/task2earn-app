import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';

export default function InviteScreen() {
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) {
        setReferralCode(user.id); // Using user ID as referral code
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleInvite = async () => {
    try {
      const inviteLink = `https://yourapp.link/invite?ref=${referralCode}`;
      await Share.share({
        message: `🎉 Join Task2Earn and earn rewards by completing simple tasks!\n\nUse my referral code to sign up: ${referralCode}\nDownload here: ${inviteLink}`,
      });
    } catch (error) {
      alert('Error sharing: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💸 Invite Friends & Earn</Text>
      <Text style={styles.description}>
        Share Task2Earn with your friends and earn bonuses when they sign up!
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#FFD700" />
      ) : (
        <>
          <Text style={styles.referralText}>Your Referral Code:</Text>
          <Text style={styles.referralCode}>{referralCode}</Text>

          <TouchableOpacity style={styles.button} onPress={handleInvite}>
            <Text style={styles.buttonText}>📤 Share Invite Link</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.note}>
        For every friend who joins using your invite code and completes tasks, you'll earn commission directly in your wallet.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e', // Dark Gray
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    color: '#FFD700', // Gold
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  referralText: {
    fontSize: 16,
    color: '#90CAF9', // Light Blue
    textAlign: 'center',
  },
  referralCode: {
    fontSize: 20,
    color: '#00C853', // Green
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#00C853', // Green
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  note: {
    color: '#90CAF9', // Light Blue
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});
