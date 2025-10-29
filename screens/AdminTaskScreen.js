import React, { useState } from 'react';
import { View, TextInput, Button, Text, Alert } from 'react-native';
import supabase from '../supabase'; // your initialized Supabase client

export default function AdminTaskScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');

  const postTask = async () => {
    if (!title || !description || !reward) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          title,
          description,
          reward: parseInt(reward),
          type: 'premium',       // mark as premium
          earn_multiplier: 10    // 10x reward for premium users
        }
      ]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Premium task posted!');
      setTitle('');
      setDescription('');
      setReward('');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Task Title:</Text>
      <TextInput value={title} onChangeText={setTitle} style={{ borderWidth: 1, marginBottom: 10 }} />

      <Text>Description:</Text>
      <TextInput value={description} onChangeText={setDescription} style={{ borderWidth: 1, marginBottom: 10 }} />

      <Text>Reward:</Text>
      <TextInput value={reward} onChangeText={setReward} keyboardType="numeric" style={{ borderWidth: 1, marginBottom: 10 }} />

      <Button title="Post Premium Task" onPress={postTask} />
    </View>
  );
}
