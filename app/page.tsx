import ChatSearch from "./components/ChatSearch";
import ContextMenu from "./components/ContextMenu";
import DesktopIcons from "./components/DesktopIcons";
import KinokoPet from "./components/KinokoPet";

export default function Home() {
  return (
    <main className="desktop">
      <DesktopIcons />
      <ChatSearch />
      <ContextMenu />
      <KinokoPet />
    </main>
  );
}