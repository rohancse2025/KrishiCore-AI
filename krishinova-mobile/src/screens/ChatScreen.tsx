import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { krishiApi } from '../services/api';
import offlineSync from '../utils/offline';
import LoadingSpinner from '../components/LoadingSpinner';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const QUICK_SUGGESTIONS = [
  'How to cure tomato early blight?',
  'Best fertilizer for Rice crops?',
  'Suggest low-water crops for Gujarat',
  'What is the ideal soil pH for sugarcane?',
];

export const ChatScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Namaste! 🙏 I am KhrishiCore AI Assistant. Ask me anything about crop diseases, mandi prices, fertilizers, or meteorological farming advice.',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const checkConnectivity = async () => {
    const online = await offlineSync.isConnected();
    setIsOnline(online);
  };

  useEffect(() => {
    checkConnectivity();
  }, []);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    await checkConnectivity();

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      text: textToSend.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    if (!isOnline) {
      let reply = "I am in offline mode. Connect internet for AI responses. Common advice: Water crops early morning, check soil moisture before irrigating, use neem-based pesticides for pests.";
      const lower = textToSend.toLowerCase();
      if (lower.includes('water') || lower.includes('irrigation')) {
        reply = "Offline Advice: Water crops early in the morning to reduce evaporation. Check soil moisture 2 inches deep before watering.";
      } else if (lower.includes('disease') || lower.includes('pest')) {
        reply = "Offline Advice: For common pests, spray neem oil mixed with water. For fungal diseases, ensure proper spacing between plants for airflow.";
      } else if (lower.includes('weather')) {
        reply = "Offline Advice: Unable to fetch live weather. Typically in this season, expect moderate humidity. Please check skies locally.";
      }

      const offlineMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        text: reply,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setTimeout(() => {
        setMessages((prev) => [...prev, offlineMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }, 500);
      return;
    }



    setLoading(true);
    try {
      const response = await krishiApi.sendChatMessage(textToSend);
      
      const aiMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        text: response.reply || 'I processed your query. Let me know if you need more farming details!',
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      
      // Local fallback in case of simulation/API issue
      const mockReply = `I received your question: "${textToSend}". Under optimal cultivation conditions, you should focus on nitrogen enrichment, systematic watering schedules, and regular pest controls. Please verify with our agronomy guides.`;
      
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          text: mockReply,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.rowUser : styles.rowAi]}>
        {!isUser && (
          <View style={styles.avatarCircle}>
            <Ionicons name="sparkles" size={12} color="#ffffff" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
          <Text style={[styles.bubbleText, isUser ? styles.textUser : styles.textAi]}>
            {item.text}
          </Text>
          <Text style={[styles.timestampText, isUser ? styles.timeUser : styles.timeAi]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.container}
    >
      {/* Offline banner */}
      {!isOnline && (
        <View style={styles.offlineAlertRow}>
          <Ionicons name="wifi-outline" size={16} color="#b91c1c" />
          <Text style={styles.offlineAlertText}>Consult AI chat needs active internet</Text>
        </View>
      )}

      {/* Messages Feed */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Quick suggestions row */}
      {isOnline && messages.length === 1 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsTitle}>Tap to ask instantly:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionScroll}>
            {QUICK_SUGGESTIONS.map((sug, idx) => (
              <TouchableOpacity key={idx} style={styles.suggestionPill} onPress={() => handleSendMessage(sug)}>
                <Text style={styles.suggestionPillText}>{sug}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Footer input controller */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={isOnline ? "Ask Agronomist AI..." : "Ask offline AI..."}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage(inputText)}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity style={[styles.sendBtn, !isOnline && { backgroundColor: '#64748b' }]} onPress={() => handleSendMessage(inputText)}>
            <Ionicons name="send" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  offlineAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fca5a5',
  },
  offlineAlertText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    maxWidth: '80%',
  },
  rowUser: {
    alignSelf: 'flex-end',
  },
  rowAi: {
    alignSelf: 'flex-start',
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleUser: {
    backgroundColor: '#15803d',
    borderBottomRightRadius: 2,
  },
  bubbleAi: {
    backgroundColor: '#e2e8f0',
    borderBottomLeftRadius: 2,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textUser: {
    color: '#ffffff',
    fontWeight: '600',
  },
  textAi: {
    color: '#0f172a',
    fontWeight: '600',
  },
  timestampText: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'right',
  },
  timeUser: {
    color: '#a7f3d0',
  },
  timeAi: {
    color: '#64748b',
  },
  suggestionsSection: {
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginLeft: 16,
    marginBottom: 6,
  },
  suggestionScroll: {
    paddingLeft: 12,
  },
  suggestionPill: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  suggestionPillText: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '700',
  },
  inputContainer: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    paddingHorizontal: 18,
    fontSize: 14,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  lockedInputRow: {
    flexDirection: 'row',
    height: 44,
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  lockedText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ChatScreen;
