import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';

export default function AdminSubmissionsScreen() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigation = useNavigation();

  // Fetch admin status and submissions
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user exists in the admins table
      const { data: admin } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (admin) {
        setIsAdmin(true);
        fetchSubmissions();
      } else {
        Alert.alert('Access Denied', 'You are not authorized to view this page.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error checking admin status:', error.message);
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id,
        task_id,
        task_type,
        user_id,
        proof_screenshot_url,
        status,
        platform,
        platform_username,
        reward,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) console.error(error.message);
    else setSubmissions(data || []);
    setLoading(false);
  };

  const handleApproval = async (submissionId, status) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('submissions')
        .update({
          status: status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (error) throw error;

      Alert.alert(
        'Success',
        `Submission ${status === 'approved' ? 'approved' : 'rejected'} successfully!`
      );
      fetchSubmissions();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>Platform: {item.platform || 'N/A'}</Text>
      <Text style={styles.text}>Username: {item.platform_username || 'N/A'}</Text>
      <Text style={styles.text}>Task Type: {item.task_type}</Text>
      <Text style={styles.text}>Status: {item.status}</Text>
      <Text style={styles.text}>Date: {new Date(item.created_at).toLocaleString()}</Text>

      {item.proof_screenshot_url && (
        <Image
          source={{ uri: item.proof_screenshot_url }}
          style={styles.screenshot}
        />
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.approveBtn]}
          onPress={() => handleApproval(item.id, 'approved')}
        >
          <Text style={styles.buttonText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.rejectBtn]}
          onPress={() => handleApproval(item.id, 'rejected')}
        >
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#fff' }}>You are not authorized to view this page.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Admin Submissions</Text>

      {submissions.length === 0 ? (
        <Text style={styles.noData}>No submissions yet.</Text>
      ) : (
        <FlatList
          data={submissions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 15,
  },
  header: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  text: {
    color: '#aaa',
    marginVertical: 2,
  },
  screenshot: {
    width: '100%',
    height: 180,
    marginVertical: 10,
    borderRadius: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  approveBtn: {
    backgroundColor: '#2ecc71',
  },
  rejectBtn: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  noData: {
    color: '#999',
    textAlign: 'center',
    marginTop: 50,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
