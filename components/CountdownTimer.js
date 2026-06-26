import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';

function formatTime(ms) {
  if (ms <= 0) return null;

  const totalMin = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const minutes = totalMin % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function CountdownTimer({ until, style }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60000); // every 1 minute
    return () => clearInterval(id);
  }, []);

  if (!until) {
    return null;
  }

  const target = new Date(until).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return <Text style={style}>Available now</Text>;
  }

  return <Text style={style}>Available in {formatTime(diff)}</Text>;
}
