import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Button } from '@/components/button/Button';
import { List, ListItem } from '@/components/list/List';
import { colors, spacing, typography } from '@/constants/theme';
import type { DownloadSearchQuery } from '@/hooks/generated';
import type { DownloadFileInput } from '@/hooks/generated/types';
import {
  fileBasename,
  formatBitRate,
  formatBytes,
} from '../utils/format';

type SearchResult = NonNullable<DownloadSearchQuery['downloadSearch']>;
type Peer = SearchResult['peers'][number];
type Folder = Peer['folders'][number];
type File = Folder['files'][number];

type Props = {
  searchResult: SearchResult | null;
  searching: boolean;
  isComplete: boolean;
  error: string | null;
  onDownload: (peer: string, files: DownloadFileInput[]) => void;
  downloading: boolean;
};

function peerSubtitle(peer: Peer): string {
  const parts: string[] = [];
  if (peer.hasFreeUploadSlot) parts.push('Free slot');
  if (peer.uploadSpeed != null && peer.uploadSpeed > 0) {
    parts.push(formatBytes(peer.uploadSpeed) + '/s');
  }
  if (peer.queueLength != null) parts.push(`Queue ${peer.queueLength}`);
  const fileCount = peer.folders.reduce((n, f) => n + f.files.length, 0);
  parts.push(`${fileCount} file${fileCount === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

function fileSubtitle(file: File): string {
  const parts = [formatBytes(file.size)];
  const br = formatBitRate(file.bitRate);
  if (br) parts.push(br);
  if (file.extension) parts.push(file.extension.toUpperCase());
  return parts.join(' · ');
}

function PeerSection({
  peer,
  onDownload,
  downloading,
}: {
  peer: Peer;
  onDownload: (peer: string, files: DownloadFileInput[]) => void;
  downloading: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.peerBlock}>
      <ListItem
        title={peer.peer}
        subtitle={peerSubtitle(peer)}
        onPress={() => setExpanded((v) => !v)}
        trailing={
          <Text style={styles.expandHint}>{expanded ? 'Hide' : 'Show'}</Text>
        }
        divider
      />
      {expanded &&
        peer.folders.map((folder) => (
          <FolderSection
            key={`${peer.peer}:${folder.name}`}
            peer={peer.peer}
            folder={folder}
            onDownload={onDownload}
            downloading={downloading}
          />
        ))}
    </View>
  );
}

function FolderSection({
  peer,
  folder,
  onDownload,
  downloading,
}: {
  peer: string;
  folder: Folder;
  onDownload: (peer: string, files: DownloadFileInput[]) => void;
  downloading: boolean;
}) {
  const handleFolderDownload = () => {
    onDownload(
      peer,
      folder.files.map((f) => ({ filename: f.filename, size: f.size })),
    );
  };

  return (
    <View style={styles.folderBlock}>
      <View style={styles.folderHeader}>
        <Text style={styles.folderName} numberOfLines={2}>
          {folder.name || 'Untitled folder'}
        </Text>
        <Button
          title="Download folder"
          variant="secondary"
          size="sm"
          onPress={handleFolderDownload}
          disabled={downloading || folder.files.length === 0}
        />
      </View>
      <List>
        {folder.files.map((file, index) => (
          <ListItem
            key={file.filename}
            title={fileBasename(file.filename)}
            subtitle={fileSubtitle(file)}
            trailing={
              <Button
                title="Get"
                variant="ghost"
                size="sm"
                onPress={() =>
                  onDownload(peer, [
                    { filename: file.filename, size: file.size },
                  ])
                }
                disabled={downloading}
              />
            }
            divider={index < folder.files.length - 1}
          />
        ))}
      </List>
    </View>
  );
}

export function DownloadSearchResults({
  searchResult,
  searching,
  isComplete,
  error,
  onDownload,
  downloading,
}: Props) {
  if (error && !searchResult) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!searchResult && searching) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.statusText}>Starting search…</Text>
      </View>
    );
  }

  if (!searchResult) {
    return null;
  }

  const peers = searchResult.peers;

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        {searching && !isComplete ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : null}
        <Text style={styles.statusText}>
          {isComplete
            ? `Found ${searchResult.fileCount} files from ${searchResult.responseCount} peers`
            : `Searching… ${searchResult.responseCount} peers, ${searchResult.fileCount} files`}
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {peers.length === 0 && isComplete ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No downloadable files found</Text>
        </View>
      ) : (
        peers.map((peer) => (
          <PeerSection
            key={peer.peer}
            peer={peer}
            onDownload={onDownload}
            downloading={downloading}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statusText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    paddingHorizontal: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  peerBlock: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: 8,
    overflow: 'hidden',
  },
  folderBlock: {
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  folderName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  expandHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
