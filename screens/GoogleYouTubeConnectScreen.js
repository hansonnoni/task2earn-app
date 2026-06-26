import React,{
useState,
useEffect,
useCallback
} from "react";


import {
View,
Text,
TouchableOpacity,
ActivityIndicator,
Alert
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



const CLIENT_ID =
"430092156311-fl1re000dpvvq5n1vd9al5rv0r5s0a4a.apps.googleusercontent.com";



const REDIRECT_URI =

"https://pfixukibsdgasmvehutm.supabase.co/functions/v1/google-youtube-oauth";



const SCOPES =

[
"openid",
"email",
"profile",
"https://www.googleapis.com/auth/youtube.readonly"
];



export default function GoogleYouTubeConnectScreen(){


const [loading,setLoading]=useState(true);

const [connecting,setConnecting]=useState(false);

const [connected,setConnected]=useState(false);

const [channel,setChannel]=useState("");

const [successMessage, setSuccessMessage] = useState("");



const loadStatus =
useCallback(async()=>{


const {
data:{
user
}
}=await supabase.auth.getUser();



if(!user)return;



const {data}=

await supabase

.from("youtube_accounts")

.select("*")

.eq(
"user_id",
user.id
)

.maybeSingle();



if(data){

  setConnected(true);

  setChannel(
    data.channel_title
  );

} else {

  setConnected(false);

  setChannel("");

}


setLoading(false);



},[]);





useEffect(()=>{

loadStatus();

},[]);



useEffect(() => {

  const listener =
    Linking.addEventListener(
      "url",
      async ({ url }) => {

        if (
          url.includes(
            "youtube-connected"
          )
        ) {

          setSuccessMessage(
            "Google & YouTube connected successfully."
          );

          setTimeout(() => {
            setSuccessMessage("");
          }, 5000);

          await loadStatus();

        }

      }
    );

  return () => listener.remove();

}, []);


const connectYoutube = async()=>{


try{


setConnecting(true);



const {
data:{
user
}
}=await supabase.auth.getUser();



if(!user){

Alert.alert(
"Error",
"Login required"
);

return;

}



const appRedirect =

Linking.createURL(
"youtube-connected"
);



const state =

encodeURIComponent(

btoa(

JSON.stringify({

user_id:user.id,

app_redirect:appRedirect,

origin:
typeof window !== "undefined"
?
window.location.origin
:
null


})

)

);





const url =


"https://accounts.google.com/o/oauth2/v2/auth"

+

`?client_id=${CLIENT_ID}`

+

`&redirect_uri=${encodeURIComponent(
REDIRECT_URI
)}`

+

"&response_type=code"

+

`&scope=${encodeURIComponent(
SCOPES.join(" ")
)}`

+

"&access_type=offline"

+

"&prompt=consent"

+

`&state=${state}`;




const result =
  await WebBrowser.openAuthSessionAsync(
    url,
    appRedirect
  );

console.log(
  "Google browser result:",
  result
);

if (
  result.type === "success"
) {

  console.log(
    "Google returned successfully, refreshing..."
  );

  await loadStatus();

  setSuccessMessage(
    "Google & YouTube connected successfully."
  );

  setTimeout(() => {
    setSuccessMessage("");
  }, 5000);

}




}

catch(e){

Alert.alert(
"Google Error",
e.message
);

}

finally{

setConnecting(false);

}


};





if(loading)
return <ActivityIndicator/>;




return(

<View
style={{
padding:20,
alignItems:"center"
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


{
connected?

<>
  <Text
    style={{
      color:"green",
      fontWeight:"bold",
      marginBottom:10
    }}
  >
    Connected ✓
  </Text>

  <Text
    style={{
      fontSize:18,
      fontWeight:"bold",
      marginBottom:15
    }}
  >
    {channel}
  </Text>

  <TouchableOpacity
    disabled
    style={{
      backgroundColor:"#666",
      paddingHorizontal:20,
      paddingVertical:12,
      borderRadius:8
    }}
  >
    <Text
      style={{
        color:"#fff",
        fontWeight:"bold"
      }}
    >
      Google + YouTube Connected
    </Text>
  </TouchableOpacity>
</>


:

<TouchableOpacity

onPress={connectYoutube}

style={{
backgroundColor:"#ff0000",
padding:15,
borderRadius:8
}}

>


{
connecting?

<ActivityIndicator color="white"/>

:

<Text
style={{
color:"white",
fontWeight:"bold"
}}
>
Connect Google + YouTube
</Text>

}



</TouchableOpacity>


}


</View>


);


}