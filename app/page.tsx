import ChatSearch from "./components/ChatSearch";
import ContextMenu from "./components/ContextMenu";
import DesktopIcons from "./components/DesktopIcons";

export default function Home() {
  return (
    <main className="desktop">
      <DesktopIcons />
      <ChatSearch />
      <ContextMenu />
    </main>
  );
}