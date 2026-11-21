import ChatSearch from "./components/ChatSearch";
import ContextMenu from "./components/ContextMenu";
import DesktopIcons from "./components/DesktopIcons";
import KinokoPet from "./components/KinokoPet";
import LockScreen from "./components/LockScreen";
import Taskbar from "./components/Taskbar";

export default function Home() {
  return (
    <>
      <main className="desktop">
        <DesktopIcons />
        <ChatSearch />
        <ContextMenu />
        <Taskbar />
        <KinokoPet />
      </main>
      {/* di luar <main> supaya desktop bisa di-"inert" selama layar login tampil */}
      <LockScreen />
    </>
  );
}