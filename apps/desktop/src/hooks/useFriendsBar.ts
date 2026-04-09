import { useFriends } from '../context/FriendsContext';

/**
 * Smart hook for the FriendsBar panel.
 * Exposes friends data and mutation actions.
 * Orientation is derived from Bento dimensions in the component itself.
 */
export function useFriendsBar() {
    const { friends, pending, sendRequest, acceptRequest, rejectRequest, removeFriend } = useFriends();

    return {
        friends,
        pending,
        sendRequest,
        acceptRequest,
        rejectRequest,
        removeFriend,
    };
}

