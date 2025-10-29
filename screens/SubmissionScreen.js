import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function SubmissionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const task = route.params?.task || {};

  // Default proof requirements if none provided
  const defaultProof = ['username', 'screenshot'];
  const proofRequired = task.proof_required || defaultProof;
  const proofLabels = task.proof_labels || { username: 'Profile name / handle', link: 'Proof link' };

  const [user, setUser] = useState(null);
  const [fields, setFields] = useState({});
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ✅ Load user ONCE when screen mounts
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) console.log('Auth getUser error', error);
        else setUser(data.user || null);
      } catch (e) {
        console.log('getUser exception', e);
      }
    };
    getUser();
  }, []); // <-- run once only

  // ✅ Initialize dynamic fields ONLY when task changes
  useEffect(() => {
    if (!proofRequired) return;
    const init = {};
    proofRequired.forEach((p) => (init[p] = ''));
    setFields(init);
  }, [task?.id]); // depend only on task id

  // Request permission for image picker ONCE
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera roll permissions are required to upload screenshots.');
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (e) {
      console.log('ImagePicker error', e);
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const uriToBlob = async (uri) => {
    const response = await fetch(uri);
    return await response.blob();
  };

  const uploadImageToSupabase = async (localUri, userId) => {
    if (!localUri) return null;
    setUploading(true);
    try {
      const blob = await uriToBlob(localUri);
      const filename = `${task.id}_${Date.now()}.jpg`;
      const path = `${userId}/${filename}`;
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(path, blob, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('submissions').getPublicUrl(path);
      setUploading(false);
      return publicData.publicUrl;
    } catch (e) {
      console.log('uploadImageToSupabase error', e);
      setUploading(false);
      return null;
    }
  };

  const handleChange = (key, value) => setFields((s) => ({ ...s, [key]: value }));

  const validate = () => {
    for (const p of proofRequired) {
      if (p === 'screenshot') continue;
      if (!fields[p] || fields[p].trim() === '') {
        return { ok: false, missing: p };
      }
    }
    return { ok: true };
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to submit tasks.');
      return;
    }

    const v = validate();
    if (!v.ok) {
      Alert.alert('Missing info', `Please provide ${proofLabels[v.missing] || v.missing}.`);
      return;
    }

    setSubmitting(true);
    try {
      let screenshot_url = null;
      if (image) {
        screenshot_url = await uploadImageToSupabase(image, user.id);
      }

      const payload = {
        user_id: user.id,
        user_email: user.email || null,
        task_id: task.id,
        task_title: task.title || null,
        platform: task.platform || null,
        proof_username: fields.username || null,
        proof_link: fields.link || null,
        screenshot_url: screenshot_url,
        additional_note: fields.note || null,
        status: 'pending',
      };

      const { error: insertError } = await supabase.from('task_submissions').insert([payload]);
      if (insertError) throw insertError;

      setSubmitting(false);
      Alert.alert('Submitted', '✅ Your proof has been submitted for review.');
      navigation.goBack();
    } catch (e) {
      console.log('submit error', e);
      setSubmitting(false);
      Alert.alert('Error', 'Could not submit proof. Try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Submit Proof for:</Text>
      <View style={styles.card}>
        <Text style={styles.title}>{task.title || 'Task'}</Text>
        <Text style={styles.meta}>Platform: {task.platform || 'Generic'}</Text>
        <Text style={styles.meta}>Reward: {task.reward ?? '—'} coins</Text>
      </View>

      {proofRequired.includes('username') && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{proofLabels.username || 'Profile name / handle'}</Text>
          <TextInput
            placeholder={proofLabels.username || 'e.g. johndoe'}
            value={fields.username}
            onChangeText={(t) => handleChange('username', t)}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>
      )}

      {proofRequired.includes('link') && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{proofLabels.link || 'Proof link'}</Text>
          <TextInput
            placeholder={proofLabels.link || 'https://...'}
            value={fields.link}
            onChangeText={(t) => handleChange('link', t)}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>
      )}

      {proofRequired.includes('screenshot') && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Screenshot (optional)</Text>
          {image ? (
            <Image source={{ uri: image }} style={styles.preview} />
          ) : (
            <View style={styles.noPreview}>
              <Text style={{ color: '#666' }}>No image selected</Text>
            </View>
          )}
          <TouchableOpacity onPress={pickImage} style={styles.buttonOutline}>
            <Text style={styles.buttonOutlineText}>{image ? 'Change screenshot' : 'Upload screenshot'}</Text>
          </TouchableOpacity>
          {uploading && <ActivityIndicator style={{ marginTop: 8 }} />}
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Additional note (optional)</Text>
        <TextInput
          placeholder="Any extra info for reviewers"
          value={fields.note}
          onChangeText={(t) => handleChange('note', t)}
          style={[styles.input, { height: 90 }]}
          multiline
        />
      </View>

      <TouchableOpacity onPress={handleSubmit} style={styles.submitButton} disabled={submitting || uploading}>
        {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>Submit Task</Text>}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#000',
    flexGrow: 1,
  },
  header: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2b2b2b',
  },
  title: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  meta: {
    color: '#ddd',
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#ccc',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#111',
    borderColor: '#333',
    borderWidth: 1,
    color: '#fff',
    padding: 10,
    borderRadius: 8,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  noPreview: {
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2b2b2b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#ffd700',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonOutlineText: {
    color: '#ffd700',
  },
  submitButton: {
    backgroundColor: '#ffd700',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#000',
    fontWeight: '700',
  },
});
