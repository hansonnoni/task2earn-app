import React,{useState,useEffect,useCallback} from "react";

import {
View,
Text,
TouchableOpacity,
ActivityIndicator,
Alert,
Platform
}
from "react-native";


import * as WebBrowser
from "expo-web-browser";


import * as Linking
from "expo-linking";


import {encode as btoa}
from "base-64";


import {supabase}
from "../supabase";



WebBrowser.maybeCompleteAuthSession();



const CLIENT_KEY =
"sbawr06liizpfa2wpy";



const REDIRECT_URI =

"https://pfixukibsdgasmvehutm.supabase.co/functions/v1/tiktok-oauth";



const SCOPES = [

"user.info.basic",

"user.info.profile",

"video.list"

];




export default function TikTokConnectScreen(){


const [loading,setLoading]=useState(true);

const [connecting,setConnecting]=useState(false);


const [connected,setConnected]=useState(false);


const [name,setName]=useState("");
const [successMessage, setSuccessMessage] =
  useState("");




const loadStatus =
useCallback(async()=>{


try{


const {
data:{
user
}

}=await supabase.auth.getUser();



if(!user)return;



const {data,error}=

await supabase

.from("tiktok_accounts")

.select("*")

.eq(
"user_id",
user.id
)

.maybeSingle();



if(error)throw error;



if(data){

setConnected(true);

setName(
data.display_name
);

}



}

catch(e){

console.log(
"TikTok load error",
e
);

}

finally{

setLoading(false);

}


},[]);




useEffect(()=>{

loadStatus();

},[]);

useEffect(() => {
  if (Platform.OS === "web") {
    const params = new URLSearchParams(window.location.search);

    if (params.get("connected") === "1") {
      loadStatus();

      setSuccessMessage(
        "TikTok account connected successfully."
      );

      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);

      // Optional: remove ?connected=1 from the URL
      window.history.replaceState(
        {},
        "",
        "/TiktokConnect"
      );
    }
  }
}, []);


useEffect(()=>{


const sub =

Linking.addEventListener(

"url",

({url})=>{


if(

url.includes(
"task2earn://tiktok-connected"
)

){

setSuccessMessage(
  "TikTok account connected successfully."
);

setTimeout(() => {
  setSuccessMessage("");
}, 5000);


loadStatus();

}


}

);



return ()=>sub.remove();



},[]);






const connectTikTok = async () => {
  try {
    setConnecting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();


    if (!user) {
      Alert.alert(
        "Error",
        "You must be logged in."
      );
      return;
    }


    const appRedirect =
      Linking.createURL(
        "tiktok-connected"
      );


    const state =
      encodeURIComponent(
        btoa(
          JSON.stringify({
            user_id: user.id,

            origin:
  Platform.OS === "web"
    ? window.location.href
    : null,

            app_redirect:
              appRedirect,
          })
        )
      );


    const authUrl =

      "https://www.tiktok.com/v2/auth/authorize/"

      +

      `?client_key=${CLIENT_KEY}`

      +

      "&response_type=code"

      +

      `&scope=${encodeURIComponent(
        SCOPES.join(",")
      )}`

      +

      `&redirect_uri=${encodeURIComponent(
        REDIRECT_URI
      )}`

      +

      `&state=${state}`;



    console.log(
      "TikTok Auth URL:",
      authUrl
    );



    const result =

      await WebBrowser.openAuthSessionAsync(

        authUrl,

        appRedirect

      );


    console.log(
      "TikTok browser result:",
      result
    );


    // THIS IS THE IMPORTANT PART

    if (
      result.type === "success"
    ) {

      console.log(
        "TikTok returned successfully, refreshing..."
      );


      await loadStatus();

setSuccessMessage(
  "TikTok account connected successfully."
);

setTimeout(() => {
  setSuccessMessage("");
}, 5000);

    }


  }

  catch(error){

    console.log(
      "TikTok connect error:",
      error
    );


    Alert.alert(
      "TikTok Error",
      String(error)
    );

  }

  finally {

    setConnecting(false);

  }

};



if(loading){

return <ActivityIndicator/>;

}



return(

<View
  style={{
    padding: 20,
    alignItems: "center",
  }}
>
    {successMessage ? (
  <Text
    style={{
      color: "green",
      fontWeight: "bold",
      marginBottom: 15,
      textAlign: "center",
    }}
  >
    {successMessage}
  </Text>
) : null}

  {connected ? (

    <>

      <Text
        style={{
          color: "green",
          fontWeight: "bold",
          marginBottom: 10,
        }}
      >
        Connected ✓
      </Text>

      <Text
        style={{
          fontSize: 18,
          fontWeight: "bold",
          marginBottom: 15,
        }}
      >
        {name}
      </Text>

      <TouchableOpacity
        disabled
        style={{
          backgroundColor: "#666",
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          TikTok Connected
        </Text>
      </TouchableOpacity>

    </>

  ) : (

    <>

      <Text
        style={{
          marginBottom: 15,
        }}
      >
        No TikTok account connected
      </Text>

      <TouchableOpacity
        onPress={connectTikTok}
        disabled={connecting}
        style={{
          backgroundColor: "#000",
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 8,
        }}
      >
        {connecting ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            Connect TikTok
          </Text>
        )}
      </TouchableOpacity>

    </>

  )}

</View>

);


}