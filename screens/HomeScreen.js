import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons, MaterialIcons, Entypo } from '@expo/vector-icons';

const HomeScreen = () => {
  return (
    <ScrollView style={styles.container}>
      
      {/* 🏁 Promo Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>🔥 Invite 3 Friends & Win $10 Instantly!</Text>
      </View>

      {/* 🎯 Featured Tasks */}
      <Text style={styles.sectionTitle}>Featured Tasks</Text>
      <View style={styles.taskCard}>
        <Text style={styles.taskTitle}>🎵 Stream “Biggest Boy” on Boomplay</Text>
        <Text style={styles.taskReward}>Earn ₦100</Text>
      </View>
      <View style={styles.taskCard}>
        <Text style={styles.taskTitle}>📸 Follow @Task2Earn on Instagram</Text>
        <Text style={styles.taskReward}>Earn ₦80</Text>
      </View>

      {/* 💰 Referral Summary */}
      <Text style={styles.sectionTitle}>Your Referrals</Text>
      <View style={styles.referralBox}>
        <Text style={styles.referralText}>You've earned ₦1,200 from referrals</Text>
        <TouchableOpacity style={styles.referralButton}>
          <Text style={styles.referralButtonText}>Invite More</Text>
        </TouchableOpacity>
      </View>

      {/* 📱 Quick Access */}
      <Text style={styles.sectionTitle}>Quick Access</Text>
      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickIcon}>
          <Ionicons name="grid" size={28} color="#FFD700" />
          <Text style={styles.quickLabel}>Categories</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickIcon}>
          <MaterialIcons name="upload" size={28} color="#32CD32" />
          <Text style={styles.quickLabel}>Submit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickIcon}>
          <Ionicons name="cash" size={28} color="#1E90FF" />
          <Text style={styles.quickLabel}>Withdraw</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickIcon}>
          <Entypo name="chat" size={28} color="#FFF" />
          <Text style={styles.quickLabel}>Support</Text>
        </TouchableOpacity>
      </View>

      {/* 📊 Weekly Summary */}
      <Text style={styles.sectionTitle}>This Week</Text>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>12 Tasks Completed</Text>
        <Text style={styles.summaryText}>₦1,300 Earned</Text>
      </View>

      {/* 📢 Tips / News */}
      <Text style={styles.sectionTitle}>Tips & Updates</Text>
      <View style={styles.tipBox}>
        <Text style={styles.tipText}>🛡️ Always complete tasks as instructed for faster approval.</Text>
        <Text style={styles.tipText}>📢 Withdrawals are processed every Friday.</Text>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 30,
    paddingTop: 10,
  },
  banner: {
    backgroundColor: '#FFD700',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 40
  },
  bannerText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  taskCard: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  taskTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  taskReward: {
    color: '#32CD32',
    fontSize: 14,
    marginTop: 4,
  },
  referralBox: {
    backgroundColor: '#1a1a1a',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  referralText: {
    color: '#FFF',
    fontSize: 15,
    marginBottom: 8,
  },
  referralButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  referralButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  quickIcon: {
    alignItems: 'center',
    width: 70,
  },
  quickLabel: {
    color: '#FFF',
    marginTop: 4,
    fontSize: 12,
  },
  summaryBox: {
    backgroundColor: '#111',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryText: {
    color: '#1E90FF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  tipBox: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 30,
  },
  tipText: {
    color: '#FFF',
    fontSize: 13,
    marginBottom: 6,
  },
});

export default HomeScreen;
