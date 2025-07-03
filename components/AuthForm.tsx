import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.maxWidth}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Zene</Text>
            <Text style={styles.tagline}>
              Great Minds don't wander. They Conquer
            </Text>
          </View>

          {/* Auth Form */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
              <Text style={styles.formSubtitle}>
                {isSignUp ? 'Start your mindful journey' : 'Continue your mindful journey'}
              </Text>
            </View>

            <View style={styles.formFields}>
              {isSignUp && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <View style={styles.inputContainer}>
                    <View style={styles.inputIcon}>
                      <User size={18} color="#fbbf24" />
                    </View>
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      style={styles.textInput}
                      placeholder="Enter your full name"
                      placeholderTextColor="#fbbf24"
                    />
                  </View>
                </View>
              )}

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Mail size={18} color="#fbbf24" />
                  </View>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    style={styles.textInput}
                    placeholder="Enter your email"
                    placeholderTextColor="#fbbf24"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Lock size={18} color="#fbbf24" />
                  </View>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    style={[styles.textInput, styles.passwordInput]}
                    placeholder="Enter your password"
                    placeholderTextColor="#fbbf24"
                    secureTextEntry={!showPassword}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#fbbf24" />
                    ) : (
                      <Eye size={18} color="#fbbf24" />
                    )}
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleEmailAuth}
                disabled={loading}
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              >
                {loading ? (
                  <View style={styles.loadingSpinner} />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </Text>
                    <ArrowRight size={18} color="white" />
                  </>
                )}
              </Pressable>
            </View>

            {/* Toggle Sign Up/Sign In */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              </Text>
              <Pressable
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setEmail('');
                  setPassword('');
                  setFullName('');
                }}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleButtonText}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffdf7',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  maxWidth: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  tagline: {
    color: '#b45309',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: '#fde68a',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5.46,
    elevation: 9,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  formSubtitle: {
    color: '#d97706',
    fontSize: 14,
    textAlign: 'center',
  },
  formFields: {
    gap: 16,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  textInput: {
    flex: 1,
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    color: '#92400e',
    fontSize: 16,
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#d97706',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'white',
    borderTopColor: 'transparent',
    borderRadius: 10,
  },
  toggleContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  toggleText: {
    color: '#d97706',
    fontSize: 14,
  },
  toggleButton: {
    marginTop: 4,
  },
  toggleButtonText: {
    color: '#b45309',
    fontWeight: '600',
    fontSize: 14,
  },
});