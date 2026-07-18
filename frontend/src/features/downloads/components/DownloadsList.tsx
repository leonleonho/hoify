import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { List, ListItem } from '@/components/list/List';
import { colors, spacing, typography } from '@/constants/theme';
import type { DownloadsQuery } from '@/hooks/generated';
import {
  fileBasename,
  formatBytes,
  formatSpeed,
} from '../utils/format';
import { isTerminalStatus } from '../hooks/useDownloads';

type Download = DownloadsQuery['downloads'][number];

type Props = {
  downloads: Download[];
  loading: boolean;
  error: Error | null;
};

function statusLabel(download: Download): string {
  const parts = [download.status];
  if (
    !isTerminalStatus(download.status) &&
    download.percentComplete != null
  ) {
    parts.push(`${Math.round(download.percentComplete)}%`);
  }
  const speed = formatSpeed(download.averageSpeed);
  if (speed) parts.push(speed);
  return parts.join(' · ');
}

function downloadSubtitle(download: Download): string {
  return `${formatBytes(download.size)} · ${download.peer} · ${statusLabel(download)}`;
}

export function DownloadsList({ downloads, loading, error }: Props) {
  if (loading && downloads.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && downloads.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Failed to load downloads: {error.message}
        </Text>
      </View>
    );
  }

  if (downloads.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No downloads yet</Text>
      </View>
    );
  }

  return (
    <List header="YOUR DOWNLOADS">
      {downloads.map((download, index) => (
        <ListItem
          key={download.id}
          title={fileBasename(download.filename)}
          subtitle={downloadSubtitle(download)}
          trailing={
            !isTerminalStatus(download.status) ? (
              <Text style={styles.progress}>
                {download.percentComplete != null
                  ? `${Math.round(download.percentComplete)}%`
                  : '…'}
              </Text>
            ) : (
              <Text
                style={[
                  styles.statusBadge,
                  download.status === 'completed'
                    ? styles.statusDone
                    : styles.statusFailed,
                ]}
              >
                {download.status}
              </Text>
            )
          }
          divider={index < downloads.length - 1}
        />
      ))}
    </List>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  progress: {
    ...typography.caption,
    color: colors.primary,
  },
  statusBadge: {
    ...typography.caption,
    textTransform: 'capitalize',
  },
  statusDone: {
    color: colors.primary,
  },
  statusFailed: {
    color: colors.error,
  },
});
