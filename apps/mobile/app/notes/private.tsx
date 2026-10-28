import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { PrivateNote } from '@infernux/shared';

export default function PrivateNotesScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();

  const [notes, setNotes] = useState<PrivateNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    const res = await api.get<PrivateNote[]>('/notes/private');
    if (res.success && res.data) {
      setNotes(res.data);
    }
  };

  const handleSaveNote = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Note title is required');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    if (editingNoteId) {
      await api.patch(`/notes/private/${editingNoteId}`, {
        title: title.trim(),
        content,
        tags,
        isPinned,
      });
    } else {
      await api.post('/notes/private', {
        title: title.trim(),
        content,
        tags,
        isPinned,
      });
    }

    setIsEditorVisible(false);
    resetForm();
    fetchNotes();
  };

  const handleDeleteNote = async (id: string) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this private note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/notes/private/${id}`);
          fetchNotes();
        },
      },
    ]);
  };

  const openEditor = (note?: PrivateNote) => {
    if (note) {
      setEditingNoteId(note.id);
      setTitle(note.title);
      setContent(note.content);
      setTagsInput(note.tags.join(', '));
      setIsPinned(note.isPinned);
    } else {
      resetForm();
    }
    setIsEditorVisible(true);
  };

  const resetForm = () => {
    setEditingNoteId(null);
    setTitle('');
    setContent('');
    setTagsInput('');
    setIsPinned(false);
  };

  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.includes(q))
    );
  });

  const renderNoteCard = ({ item }: { item: PrivateNote }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => openEditor(item)}
      style={[
        styles.noteCard,
        { backgroundColor: colors.surfaceElevated, borderColor: item.isPinned ? colors.primary : colors.border },
      ]}
    >
      <View style={styles.noteTopRow}>
        <Text numberOfLines={1} style={[typography.body1, { color: colors.text, fontWeight: '700', flex: 1 }]}>
          {item.title}
        </Text>
        {item.isPinned && <Ionicons name="pin" size={16} color={colors.primary} style={{ marginLeft: 6 }} />}
        <TouchableOpacity onPress={() => handleDeleteNote(item.id)} style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text numberOfLines={3} style={[typography.body2, { color: colors.textSecondary, marginTop: 6 }]}>
        {item.content || 'Empty note...'}
      </Text>

      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map((t) => (
            <View key={t} style={[styles.tagPill, { backgroundColor: colors.surface }]}>
              <Text style={[typography.caption, { color: colors.primary, fontSize: 10 }]}>#{t}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 8, fontSize: 10 }]}>
        Updated {new Date(item.updatedAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>Private Notes</Text>
        <TouchableOpacity onPress={() => openEditor()} style={styles.addBtn}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          placeholder="Search private notes or #tags..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      {/* Notes List */}
      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        renderItem={renderNoteCard}
        contentContainerStyle={styles.notesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
              Encrypted Private Vault
            </Text>
            <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              Notes created here are strictly confidential and only accessible by your account.
            </Text>
          </View>
        }
      />

      {/* Note Editor Modal */}
      <Modal visible={isEditorVisible} animationType="slide">
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setIsEditorVisible(false)} style={styles.backBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[typography.h3, { color: colors.text }]}>
              {editingNoteId ? 'Edit Note' : 'New Private Note'}
            </Text>
            <TouchableOpacity onPress={() => setIsPinned(!isPinned)}>
              <Ionicons
                name={isPinned ? 'pin' : 'pin-outline'}
                size={22}
                color={isPinned ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <View style={{ padding: spacing.md, flex: 1 }}>
            <Input
              label="Title"
              placeholder="Note title..."
              value={title}
              onChangeText={setTitle}
            />

            <Input
              label="Tags (comma separated)"
              placeholder="e.g. work, ideas, personal"
              value={tagsInput}
              onChangeText={setTagsInput}
            />

            <TextInput
              placeholder="Write your note here..."
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              style={[
                styles.contentInput,
                typography.body1,
                { color: colors.text, backgroundColor: colors.surfaceElevated },
              ]}
            />

            <Button title="Save Note" onPress={handleSaveNote} style={{ marginTop: spacing.md }} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    padding: spacing.xs,
  },
  addBtn: {
    padding: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    height: 42,
    borderRadius: borderRadius.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  notesList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  noteCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  noteTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.sm,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  contentInput: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
});
