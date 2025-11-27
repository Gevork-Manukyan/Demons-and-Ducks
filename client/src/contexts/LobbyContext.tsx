"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";

export type LobbyGame = {
    id: string;
    gameName: string;
    isPrivate: boolean;
    numPlayersTotal: number;
    numCurrentPlayers: number;
};

type LobbyContextType = {
    error: string;
    isJoining: boolean;
    setIsJoining: (isJoining: boolean) => void;
    currentGames: LobbyGame[];
    showModal: boolean;
    setShowModal: (showModal: boolean) => void;
    refreshGames: () => Promise<void>;
    addPlaceholderGame: (draft: {
        gameName: string;
        isPrivate: boolean;
        numPlayersTotal: number;
    }) => void;
};

const LobbyContext = createContext<LobbyContextType | null>(null);

type LobbyProviderProps = {
    children: React.ReactNode;
};

const generateLobbyId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `lobby-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const demoGames: LobbyGame[] = [
    {
        id: "demo-1",
        gameName: "Demo Skirmish",
        isPrivate: false,
        numPlayersTotal: 4,
        numCurrentPlayers: 1,
    },
    {
        id: "demo-2",
        gameName: "Closed Testing Room",
        isPrivate: true,
        numPlayersTotal: 2,
        numCurrentPlayers: 2,
    },
];

export function LobbyProvider({ children }: LobbyProviderProps) {
    const [currentGames, setCurrentGames] = useState<LobbyGame[]>(() => [
        ...demoGames,
    ]);
    const [showModal, setShowModal] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string>("");

    const addPlaceholderGame = useCallback(
        (draft: {
            gameName: string;
            isPrivate: boolean;
            numPlayersTotal: number;
        }) => {
            setCurrentGames((games) => [
                {
                    id: generateLobbyId(),
                    gameName: draft.gameName,
                    isPrivate: draft.isPrivate,
                    numPlayersTotal: draft.numPlayersTotal,
                    numCurrentPlayers: 1,
                },
                ...games,
            ]);
        },
        []
    );

    const refreshGames = useCallback(async () => {
        setError("");
        setCurrentGames([...demoGames]);
    }, []);

    const contextValue = useMemo(
        () => ({
            error,
            isJoining,
            setIsJoining,
            currentGames,
            showModal,
            setShowModal,
            refreshGames,
            addPlaceholderGame,
        }),
        [
            error,
            isJoining,
            currentGames,
            showModal,
            refreshGames,
            addPlaceholderGame,
        ]
    );

    return (
        <LobbyContext.Provider value={contextValue}>
            {children}
        </LobbyContext.Provider>
    );
}

export function useLobbyContext() {
    const context = useContext(LobbyContext);
    if (!context) {
        throw new Error("useLobbyContext must be used within a LobbyProvider");
    }
    return context;
}
