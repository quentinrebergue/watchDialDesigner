import { Sketch } from './components/Sketch';
import { Toolbar } from './components/Toolbar';
import { ToolStylePanel } from './components/ToolStylePanel';
import { MeasurePanel } from './components/MeasurePanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { HelpTooltip } from './components/HelpTooltip';
import { StatusBar } from './components/StatusBar';
import { MenuBar } from './components/MenuBar';
import { ComponentLibrary } from './components/ComponentLibrary';

export default function App() {
  return (
    <div className="relative h-screen w-screen bg-[#e8e8e8] overflow-hidden text-gray-800 font-sans">
      <MenuBar />
      <Sketch />
      <Toolbar />
      <ToolStylePanel />
      <MeasurePanel />
      <ComponentLibrary />
      <PropertiesPanel />
      <StatusBar />
      <HelpTooltip />
    </div>
  );
}
