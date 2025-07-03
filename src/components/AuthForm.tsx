import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface AuthFormProps {
  onAuthSuccess: () => void;
}

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (error) throw error;
        onAuthSuccess();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onAuthSuccess();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-amber-25 via-orange-25 to-yellow-25">
      <View className="flex-1 justify-center px-4">
        <View className="max-w-md w-full mx-auto">
          {/* Header */}
          <View className="items-center mb-8">
            <Text className="text-4xl font-bold text-amber-900 mb-2">Zene</Text>
            <Text className="text-amber-700 text-sm font-medium text-center">
              Great Minds don't wander. They Conquer
            </Text>
          </View>

          {/* Auth Form */}
          <View className="bg-white rounded-2xl shadow-lg border border-amber-200 p-8">
            <View className="items-center mb-6">
              <Text className="text-2xl font-bold text-amber-900 mb-2">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
              <Text className="text-amber-600 text-sm text-center">
                {isSignUp ? 'Start your mindful journey' : 'Continue your mindful journey'}
              </Text>
            </View>

            <View className="space-y-4">
              {isSignUp && (
                <View>
                  <Text className="text-sm font-semibold text-amber-900 mb-2">
                    Full Name
                  </Text>
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <Ionicons name="person" size={18} color="#fbbf24" />
                    </View>
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      className="w-full pl-10 pr-4 py-3 border border-amber-200 rounded-lg text-amber-800"
                      placeholder="Enter your full name"
                      placeholderTextColor="#fbbf24"
                    />
                  </View>
                </View>
              )}

              <View>
                <Text className="text-sm font-semibold text-amber-900 mb-2">
                  Email Address
                </Text>
                <View className="relative">
                  <View className="absolute left-3 top-3 z-10">
                    <Ionicons name="mail" size={18} color="#fbbf24" />
                  </View>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    className="w-full pl-10 pr-4 py-3 border border-amber-200 rounded-lg text-amber-800"
                    placeholder="Enter your email"
                    placeholderTextColor="#fbbf24"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm font-semibold text-amber-900 mb-2">
                  Password
                </Text>
                <View className="relative">
                  <View className="absolute left-3 top-3 z-10">
                    <Ionicons name="lock-closed" size={18} color="#fbbf24" />
                  </View>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    className="w-full pl-10 pr-12 py-3 border border-amber-200 rounded-lg text-amber-800"
                    placeholder="Enter your password"
                    placeholderTextColor="#fbbf24"
                    secureTextEntry={!showPassword}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3"
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={18}
                      color="#fbbf24"
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleEmailAuth}
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 py-3 px-4 rounded-lg flex-row items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <View className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Text className="text-white font-semibold">
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="white" />
                  </>
                )}
              </Pressable>
            </View>

            {/* Toggle Sign Up/Sign In */}
            <View className="items-center mt-6">
              <Text className="text-amber-600 text-sm">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              </Text>
              <Pressable
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setEmail('');
                  setPassword('');
                  setFullName('');
                }}
                className="mt-1"
              >
                <Text className="text-amber-700 font-semibold">
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}