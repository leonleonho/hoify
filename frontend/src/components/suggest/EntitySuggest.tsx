import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Input } from '../input/Input';
import { colors, spacing, typography } from '../../constants/theme';
import { useSearchMusic } from '@/features/search/hooks/useSearchMusic';

const DEBOUNCE_MS = 300;

export type SuggestItem = {
  id: string;
  label: string;
  subtitle?: string;
};

type EntitySuggestProps = {
  label: string;
  /** Currently selected entity display label (shown when not actively searching). */
  selectedLabel: string;
  selectedId: string | null;
  /** Which searchMusic result set to show. */
  mode: 'artists' | 'albums';
  onSelect: (item: SuggestItem) => void;
  error?: string;
};

export function EntitySuggest({
  label,
  selectedLabel,
  selectedId,
  mode,
  onSelect,
  error,
}: EntitySuggestProps) {
  const [query, setQuery] = useState(selectedLabel);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep input in sync when parent selected label changes (e.g. after load).
  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebouncedQuery(text), DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const { searchResults, loading } = useSearchMusic(debouncedQuery);

  const items: SuggestItem[] =
    mode === 'artists'
      ? (searchResults?.artists ?? []).map((a) => ({
          id: a.id,
          label: a.name,
        }))
      : (searchResults?.albums ?? []).map((a) => ({
          id: a.id,
          label: a.title,
          subtitle: a.artist?.name,
        }));

  const handleSelect = (item: SuggestItem) => {
    onSelect(item);
    setQuery(item.label);
    setOpen(false);
    setDebouncedQuery('');
  };

  const showDropdown =
    open && debouncedQuery.trim().length >= 2 && (loading || items.length > 0);

  return (
    <View style={styles.wrapper}>
      <Input
        label={label}
        value={query}
        onChangeText={handleChangeText}
        onFocus={() => setOpen(true)}
        error={error}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {showDropdown ? (
        <View style={styles.dropdown}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            items.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.option,
                  pressed ? styles.optionPressed : undefined,
                  item.id === selectedId ? styles.optionSelected : undefined,
                ]}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.optionLabel}>{item.label}</Text>
                {item.subtitle ? (
                  <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 1,
  },
  dropdown: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    maxHeight: 200,
    overflow: 'hidden',
  },
  loader: {
    padding: spacing.md,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  optionPressed: {
    backgroundColor: colors.surface,
  },
  optionSelected: {
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
  },
  optionLabel: {
    ...typography.body,
    color: colors.text,
  },
  optionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
