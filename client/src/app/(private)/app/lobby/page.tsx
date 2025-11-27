import { LogoutBtn } from "@/components/logout-btn";
import { CreateGameBtn } from "@/components/lobby/create-game/create-game-btn";
import { CreateGameModal } from "@/components/lobby/create-game/create-game-modal";
import { JoinableGames } from "@/components/lobby/joinable-games";
import { requireUserSession } from "@/lib/server/utils";

export default async function LobbyPage() {
    await requireUserSession();

    return (
        <>
            <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800">Lobby</h1>
                    <div className="flex gap-4">
                        <CreateGameBtn />
                        <LogoutBtn />
                    </div>
                </div>
                <p className="text-gray-600">
                    Reuse this view as a staging ground for the new game. All
                    data below is placeholder-friendly so you can wire it up as
                    soon as backend endpoints are ready.
                </p>
            </div>
            <CreateGameModal />
            <JoinableGames />
        </>
    );
}
