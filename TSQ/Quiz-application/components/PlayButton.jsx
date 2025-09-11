import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Reusable circular gradient Play button
// Props: onPress, size (number), disabled (bool), loading (bool), style (ViewStyle), icon (string)
const PlayButton = ({ onPress, size = 44, disabled = false, loading = false, style, icon }) => {
  const radius = size / 2;
  const displayIcon = loading ? '⟳' : icon || '▶';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[{ width: size, height: size, borderRadius: radius }, styles.shadow, style]}
    >
      <LinearGradient
        colors={disabled ? ['#cfd8ff', '#d9ccff'] : ['#7aa8ff', '#a275ff']}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={{ flex: 1, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={[styles.inner, { width: size - 6, height: size - 6, borderRadius: radius - 3 }]}> 
          <Text style={[styles.icon, { fontSize: size * 0.5 }]}>{displayIcon}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#7aa8ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: '#ffffff',
    fontWeight: 'bold',
    lineHeight: undefined,
    textAlign: 'center',
  },
});

export default PlayButton;
