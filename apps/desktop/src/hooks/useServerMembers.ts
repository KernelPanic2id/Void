import { useEffect, useRef, useState } from 'react';
import { listServerMembers } from '../api/server.api';
import { ServerMember } from '../models/server/serverMember.model';

/**
 * Fetches resolved member profiles for a given server via
 * `GET /api/servers/:id/members` and maps them to `ServerMember[]`.
 *
 * @param serverId - The active server UUID.
 * @param ownerPublicKey - Owner's public key (used for the `isOwner` flag).
 */
export function useServerMembers(serverId: string | undefined, ownerPublicKey: string) {
    const [members, setMembers] = useState<ServerMember[]>([]);
    const [loading, setLoading] = useState(false);
    const abortRef = useRef(0);

    useEffect(() => {
        if (!serverId) {
            setMembers([]);
            return;
        }

        const _seq = ++abortRef.current;
        setLoading(true);

        listServerMembers(serverId)
            .then((summaries) => {
                if (_seq !== abortRef.current) return;
                const _mapped: ServerMember[] = summaries.map((s) => ({
                    publicKey: s.publicKey ?? '',
                    displayName: s.displayName,
                    username: s.username,
                    avatar: s.avatar ?? null,
                    isOwner: (s.publicKey ?? '') === ownerPublicKey,
                }));
                setMembers(_mapped);
            })
            .catch(() => {
                if (_seq !== abortRef.current) return;
                setMembers([]);
            })
            .finally(() => {
                if (_seq === abortRef.current) setLoading(false);
            });
    }, [serverId, ownerPublicKey]);

    return { members, loading };
}
