import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

// Screens
import SplashScreen from './screens/SplashScreen';
import SignupScreen from './screens/SignupScreen';
import EmailConfirmationScreen from './screens/EmailConfirmationScreen';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProfileScreen from './screens/ProfileScreen';
import SpotifyConnectScreen from './screens/SpotifyConnectScreen';
import HomeScreen from './screens/HomeScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

// Other Screens
import TaskDetailsScreen from './screens/TaskDetailsScreen';
import SubmissionScreen from './screens/SubmissionScreen';
import WithdrawScreen from './screens/WithdrawScreen';
import TaskListScreen from './screens/TaskListScreen';
import WalletScreen from './screens/WalletScreen';
import PaymentMethodsScreen from "./screens/PaymentMethodsScreen";
import InviteScreen from './screens/InviteScreen';
import SettingsScreen from './screens/SettingsScreen';
import SupportScreen from './screens/SupportScreen';
import NotificationScreen from './screens/NotificationScreen';
import TermsPrivacyScreen from './screens/TermsPrivacyScreen';
import UpgradeScreen from './screens/UpgradeScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Bottom Tabs for main app
function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Auth Stack (Login / Signup flow)
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
      <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen} />
    </Stack.Navigator>
  );
}

// Root Navigator
export default function AppNavigator() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);
      setLoading(false);
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Show SplashScreen only during initial loading
  if (loading) return <SplashScreen />;

  // Separate navigation flows
  return session ? (
    // Main app stack
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!session.user.email_confirmed_at ? (
        <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen} />
      ) : (
        <Stack.Screen name="MainApp" component={AppTabs} />
      )}

      {/* Global screens accessible everywhere */}
      <Stack.Screen name="SpotifyConnect" component={SpotifyConnectScreen} options={{ title: 'Connect Spotify' }} />
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
      <Stack.Screen name="Submission" component={SubmissionScreen} />
      <Stack.Screen name="Withdraw" component={WithdrawScreen} />
      <Stack.Screen name="TaskList" component={TaskListScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="Invite" component={InviteScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="UpgradeScreen" component={UpgradeScreen} />
      <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
      
    </Stack.Navigator>
  ) : (
    // Auth flow
    <AuthStack />
  );
}
