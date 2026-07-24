import React, { useEffect } from "react";

import {
  Alert,
  Platform,
  View,
  ActivityIndicator,
} from "react-native";

import * as WebBrowser from "expo-web-browser";

import { WebView } from "react-native-webview";

export default function FlutterwaveCheckoutScreen({
  route,
  navigation,
}) {

const { checkoutUrl } = route.params;

useEffect(() => {

  if (Platform.OS === "web") {

    window.location.href = checkoutUrl;

  }

}, []);

const handleNavigation = (state) => {

const url = state.url;

console.log("Redirect:", url);

if (
  url.includes("app.task2earn.app")
) {

Alert.alert(
  "Payment Received",
  "Your payment is being verified."
);

navigation.replace("MyCampaigns");

}

};

if (Platform.OS === "web") {

  return (

    <View
      style={{
        flex:1,
        justifyContent:"center",
        alignItems:"center",
      }}
    >

      <ActivityIndicator
        size="large"
      />

    </View>

  );

}

return (

  <WebView

    source={{
      uri: checkoutUrl,
    }}

    startInLoadingState

    onNavigationStateChange={
      handleNavigation
    }

  />

);

}