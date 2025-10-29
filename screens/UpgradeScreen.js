// screens/UpgradeScreen.js
import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../supabase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { FontAwesome5 } from '@expo/vector-icons';

export default function UpgradeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { taskId } = route.params || {};

  const { user, setUser } = useContext(UserContext);
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      if (!user) throw new Error('User not found');

      setLoading(true);

      // Simulate payment delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update user tier in Supabase
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ tier: 'premium', tier_updated_at: new Date() })
        .eq('id', user.id)
        .select('*')
        .single();

      if (error) throw error;

      setUser(updatedUser); 
      Alert.alert('Success', 'You are now a Premium user!');

      // Navigate to premium task if coming from one
      if (taskId) {
        navigation.replace('TaskDetails', { taskId });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      console.error('[UpgradeScreen] error:', err);
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <FontAwesome5 name="arrow-left" size={20} color="#FFD700" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Upgrade to Premium</Text>
      <Text style={styles.text}>
        Upgrade to Premium to earn 10× more rewards on premium tasks!{'\n'}
        Premium tasks are marked with a ★ in your task list.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 20 }} />
      ) : (
        <TouchableOpacity style={styles.upgradeButton} onPress={handlePayment}>
          <Text style={styles.buttonText}>Upgrade Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20, justifyContent: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backText: { color: '#FFD700', fontSize: 16, marginLeft: 6 },
  header: { fontSize: 26, color: '#FFD700', fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  text: { fontSize: 18, color: '#fff', textAlign: 'center', marginBottom: 30 },
  upgradeButton: { backgroundColor: '#FFD700', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { fontWeight: 'bold', color: '#000', fontSize: 16 },
});
