import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Square, Circle, Trash2 } from 'lucide-react';

/* ------------------ Helper / Defaults ------------------ */
/**
 * If your Electron preload sets something like
 * contextBridge.exposeInMainWorld('electron', { platform: process.platform, ... })
 * we can read `window.electron.platform`
 */
function getPlatform() {
  if (typeof window === 'undefined' || !window.electron) return 'win32';
  return window.electron.platform || 'win32';
}

// Built-in/preset layouts
const PRESET_LAYOUTS = [
  {
    id: 'mac',
    label: 'Mac Layout',
    position: 'left',    // which side are the buttons on? (left or right)
    style: 'traffic',    // "traffic lights" for mac style
    closeColor: '#FF5F57',
    minimizeColor: '#FFBD2E',
    maximizeColor: '#28C840',
  },
  {
    id: 'windows',
    label: 'Windows Layout',
    position: 'right',
    style: 'default',
    closeColor: '#FFFFFF',    // red
    minimizeColor: '#FFFFFF',
    maximizeColor: '#FFFFFF',
  },
  {
    id: 'linux',
    label: 'Linux Layout',
    position: 'right',
    style: 'circles',
    closeColor: '#FFFFFF',
    minimizeColor: '#FFFFFF',
    maximizeColor: '#FFFFFF',
  },
  {
    id: 'left',
    label: 'Controls on Left',
    position: 'left',
    style: 'default',
    closeColor: '#EF4444',
    minimizeColor: '#FFFFFF',
    maximizeColor: '#FFFFFF',
  },
];

// For transitions
const titleBarVariants = {
  initial: { y: -30, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 30, opacity: 0 },
};

const menuVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

const TitleBar = () => {
  /* ------------------ Electron Check ------------------ */
  const isElectron = typeof window !== 'undefined' && window.electron;
  if (!isElectron) return null;

  /* ------------------ State ------------------ */
  // Determine OS platform for default layout
  const platform = getPlatform(); // 'win32', 'darwin', 'linux'
  const defaultLayoutId = platform === 'darwin' ? 'mac' : platform === 'linux' ? 'linux' : 'windows';

  // Active layout (we store it as an object)
  const [activeLayout, setActiveLayout] = useState(
    PRESET_LAYOUTS.find((l) => l.id === defaultLayoutId) ||
    PRESET_LAYOUTS.find((l) => l.id === 'windows')
  );

  // If we allow custom user-defined layouts, store them here
  const [customLayouts, setCustomLayouts] = useState([]);

  // Quick menu (when clicking "BeatFly")
  const [menuOpen, setMenuOpen] = useState(false);

  // Right-click context menu
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });

  // Advanced customization dialog
  const [dialogOpen, setDialogOpen] = useState(false);

  // For creating a new custom layout
  const [newLayout, setNewLayout] = useState({
    id: '',
    label: '',
    position: 'left',
    style: 'default',
    closeColor: '#EF4444',
    minimizeColor: '#FFFFFF',
    maximizeColor: '#FFFFFF',
  });

  /* ------------------ Electron Window Controls ------------------ */
  const handleMinimize = () => window.electron?.minimize();
  const handleMaximize = () => window.electron?.maximize();
  const handleClose = () => window.electron?.close();

  /* ------------------ Quick Menu (Click "BeatFly") ------------------ */
  const toggleMenu = (e) => {
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
    // Close context menu if open
    setCtxOpen(false);
  };

  const closeMenus = () => {
    if (menuOpen) setMenuOpen(false);
    if (ctxOpen) setCtxOpen(false);
  };

  /* ------------------ Context Menu (Right Click) ------------------ */
  const handleContextMenu = (e) => {
    e.preventDefault();
    setCtxPos({ x: e.clientX, y: e.clientY });
    setCtxOpen(true);
    // Close quick menu if open
    setMenuOpen(false);
  };

  const contextMenuItems = [
    {
      label: 'Reload',
      onClick: () => window.electron?.reload?.(),
    },
    {
      label: 'Toggle DevTools',
      onClick: () => window.electron?.toggleDevTools?.(),
    },
    { type: 'separator' },
    {
      label: 'Customize Title Bar...',
      onClick: () => setDialogOpen(true),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      onClick: () => window.electron?.close(),
    },
  ];

  /* ------------------ Advanced Customization Dialog ------------------ */
  const openDialog = () => {
    setDialogOpen(true);
    setMenuOpen(false);
    setCtxOpen(false);
  };
  const closeDialog = () => setDialogOpen(false);

  // Select a layout (preset or custom)
  const handleLayoutSelection = (layout) => {
    setActiveLayout(layout);
  };

  // Create new custom layout
  const handleCreateLayout = (e) => {
    e.preventDefault();
    if (!newLayout.label.trim()) return;

    let id = newLayout.label.trim().toLowerCase().replace(/\s+/g, '_');
    if (!id) id = `layout_${Date.now()}`;

    const layoutObj = {
      ...newLayout,
      id,
    };

    setCustomLayouts((prev) => [...prev, layoutObj]);
    setActiveLayout(layoutObj);

    // Reset
    setNewLayout({
      id: '',
      label: '',
      position: 'left',
      style: 'default',
      closeColor: '#EF4444',
      minimizeColor: '#FFFFFF',
      maximizeColor: '#FFFFFF',
    });
  };

  // Delete a custom layout
  const handleDeleteLayout = (layoutId) => {
    // Optional confirmation
    const toDelete = customLayouts.find((l) => l.id === layoutId);
    if (toDelete) {
      const ok = window.confirm(`Are you sure you want to delete "${toDelete.label}"?`);
      if (!ok) return;
    }

    setCustomLayouts((prev) => prev.filter((l) => l.id !== layoutId));

    // If we're currently using that layout, fallback to a preset
    if (activeLayout.id === layoutId) {
      // e.g. switch back to default "windows" layout
      const windowsLayout = PRESET_LAYOUTS.find((l) => l.id === 'windows');
      setActiveLayout(windowsLayout);
    }
  };

  // Export custom layouts as JSON
  const handleExport = () => {
    const data = JSON.stringify(customLayouts, null, 2);
    navigator.clipboard.writeText(data).then(() => {
      alert('Custom layouts copied to clipboard!');
    });
  };

  // Import custom layouts from JSON
  const handleImport = () => {
    const jsonString = prompt('Paste your custom layouts JSON here:');
    if (!jsonString) return;
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        setCustomLayouts(parsed);
        alert('Imported custom layouts successfully!');
      } else {
        alert('Invalid JSON format. Expected an array.');
      }
    } catch (err) {
      alert('Error parsing JSON: ' + err.message);
    }
  };

  /* ------------------ Rendering the Active Layout ------------------ */
  const renderLayout = (layout) => {
    const isTraffic = layout.style === 'traffic'; // Mac-like
    const isCircles = layout.style === 'circles'; // Linux example
    const isDefault = layout.style === 'default'; // Windows or generic
    const leftSide = layout.position === 'left';

    return (
      <AnimatePresence mode="popLayout">
        <motion.div
          key={layout.id}
          className="select-none draggable flex items-center justify-between h-8 bg-[#121212]"
          variants={titleBarVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          {leftSide ? (
            <>
              {/* Buttons on Left */}
              <div className="flex non-draggable">
                {/* Mac "traffic lights" */}
                {isTraffic && (
                  <div className="flex space-x-1 ml-2 mr-2">
                    <button
                      onClick={handleClose}
                      className="h-5 w-5 flex items-center justify-center rounded-full"
                      style={{ backgroundColor: layout.closeColor }}
                      title="Close"
                    >
                      <X size={12} color="#2C2C2C" />
                    </button>
                    <button
                      onClick={handleMinimize}
                      className="h-5 w-5 flex items-center justify-center rounded-full"
                      style={{ backgroundColor: layout.minimizeColor }}
                      title="Minimize"
                    >
                      <Minus size={12} color="#2C2C2C" />
                    </button>
                    <button
                      onClick={handleMaximize}
                      className="h-5 w-5 flex items-center justify-center rounded-full"
                      style={{ backgroundColor: layout.maximizeColor }}
                      title="Maximize"
                    >
                      <Square size={12} color="#2C2C2C" />
                    </button>
                  </div>
                )}

                {/* Linux Circles */}
                {isCircles && (
                  <>
                    <button
                      onClick={handleMinimize}
                      className="h-8 w-12 flex items-center justify-center hover:bg-gray-800 text-white"
                      title="Minimize"
                    >
                      <Circle size={16} color={layout.minimizeColor} />
                    </button>
                    <button
                      onClick={handleMaximize}
                      className="h-8 w-12 flex items-center justify-center hover:bg-gray-800 text-white"
                      title="Maximize"
                    >
                      <Circle size={16} color={layout.maximizeColor} />
                    </button>
                    <button
                      onClick={handleClose}
                      className="h-8 w-12 flex items-center justify-center hover:bg-red-600 text-white"
                      title="Close"
                    >
                      <Circle size={16} color={layout.closeColor} />
                    </button>
                  </>
                )}

                {/* Default / Windows-like */}
                {isDefault && (
                  <>
                    <button
                      onClick={handleMinimize}
                      className="h-8 w-12 flex items-center justify-center hover:bg-gray-800 text-white"
                      title="Minimize"
                      style={{ color: layout.minimizeColor }}
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      onClick={handleMaximize}
                      className="h-8 w-12 flex items-center justify-center hover:bg-gray-800 text-white"
                      title="Maximize"
                      style={{ color: layout.maximizeColor }}
                    >
                      <Square size={16} />
                    </button>
                    <button
                      onClick={handleClose}
                      className="h-8 w-12 flex items-center justify-center hover:bg-red-600 text-white"
                      title="Close"
                      style={{ color: layout.closeColor }}
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
              </div>

              {/* Title area */}
              <div className="flex-1 px-2 flex items-center justify-start">
                <motion.span
                  className="text-sm font-semibold text-white cursor-pointer non-draggable"
                  whileHover={{ scale: 1.05 }}
                  onClick={toggleMenu}
                >
                  BeatFly
                </motion.span>
              </div>
            </>
          ) : (
            <>
              {/* Title area */}
              <div className="flex items-center px-4">
                <motion.span
                  className="text-sm font-semibold text-white cursor-pointer non-draggable"
                  whileHover={{ scale: 1.05 }}
                  onClick={toggleMenu}
                >
                  BeatFly
                </motion.span>
              </div>

              {/* Buttons on Right */}
              <div className="flex non-draggable">
                {isTraffic && (
                  <div className="flex space-x-1 mr-2">
                    <button
                      onClick={handleClose}
                      className="h-5 w-5 flex items-center justify-center rounded-full"
                      style={{ backgroundColor: layout.closeColor }}
                      title="Close"
                    >
                      <X size={12} color="#2C2C2C" />
                    </button>
                    <button
                      onClick={handleMinimize}
                      className="h-5 w-5 flex items-center justify-center rounded-full"
                      style={{ backgroundColor: layout.minimizeColor }}
                      title="Minimize"
                    >
                      <Minus size={12} color="#2C2C2C" />
                    </button>
                    <button
                      onClick={handleMaximize}
                      className="h-5 w-5 flex items-center justify-center rounded-full"
                      style={{ backgroundColor: layout.maximizeColor }}
                      title="Maximize"
                    >
                      <Square size={12} color="#2C2C2C" />
                    </button>
                  </div>
                )}

                {isCircles && (
                  <>
                    <button
                      onClick={handleMinimize}
                      className="h-8 w-12 flex items-center justify-center hover:bg-gray-800 text-white"
                      title="Minimize"
                    >
                      <Circle size={16} color={layout.minimizeColor} />
                    </button>
                    <button
                      onClick={handleMaximize}
                      className="h-8 w-12 flex items-center justify-center hover:bg-gray-800 text-white"
                      title="Maximize"
                    >
                      <Circle size={16} color={layout.maximizeColor} />
                    </button>
                    <button
                      onClick={handleClose}
                      className="h-8 w-12 flex items-center justify-center hover:bg-red-600 text-white"
                      title="Close"
                    >
                      <Circle size={16} color={layout.closeColor} />
                    </button>
                  </>
                )}

                {isDefault && (
                  <>
                    <button
                      onClick={handleMinimize}
                      className="h-8 w-12 flex items-center justify-center hover:bg-gray-800"
                      title="Minimize"
                      style={{ color: layout.minimizeColor }}
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      onClick={handleMaximize}
                      className="h-8 w-12 flex items-center justify-center hover:bg-gray-800"
                      title="Maximize"
                      style={{ color: layout.maximizeColor }}
                    >
                      <Square size={16} />
                    </button>
                    <button
                      onClick={handleClose}
                      className="h-8 w-12 flex items-center justify-center hover:bg-red-600"
                      title="Close"
                      style={{ color: layout.closeColor }}
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  /* ------------------ Render ------------------ */
  return (
    <div
      style={{ position: 'relative' }}
      onClick={closeMenus}
      onContextMenu={handleContextMenu}
    >
      {/* The main Title Bar (animated via layout) */}
      {renderLayout(activeLayout)}

      {/* QUICK MENU (Click "BeatFly") */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="absolute bg-gray-800 text-white rounded shadow-lg p-2 z-50"
            style={{ top: '2rem', left: '1rem' }}
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Built-in presets */}
            {PRESET_LAYOUTS.map((layout) => (
              <div
                key={layout.id}
                className="cursor-pointer px-2 py-1 hover:bg-gray-600 transition-colors duration-200"
                onClick={() => {
                  handleLayoutSelection(layout);
                  setMenuOpen(false);
                }}
              >
                {layout.label}
              </div>
            ))}
            {/* Custom layouts */}
            {customLayouts.length > 0 && (
              <>
                <hr className="my-1 border-gray-700" />
                {customLayouts.map((layout) => (
                  <div
                    key={layout.id}
                    className="cursor-pointer px-2 py-1 hover:bg-gray-600 transition-colors duration-200"
                    onClick={() => {
                      handleLayoutSelection(layout);
                      setMenuOpen(false);
                    }}
                  >
                    {layout.label} (Custom)
                  </div>
                ))}
              </>
            )}
            <hr className="my-1 border-gray-700" />
            <div
              className="cursor-pointer px-2 py-1 hover:bg-gray-600 transition-colors duration-200"
              onClick={openDialog}
            >
              Full Customization...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTEXT MENU (Right-click) */}
      <AnimatePresence>
        {ctxOpen && (
          <motion.div
            className="absolute bg-gray-800 text-white rounded shadow-lg p-1 z-50"
            style={{ top: ctxPos.y, left: ctxPos.x, minWidth: 150 }}
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenuItems.map((item, idx) => {
              if (item.type === 'separator') {
                return <hr key={`sep-${idx}`} className="my-1 border-gray-700" />;
              }
              return (
                <div
                  key={item.label}
                  className="cursor-pointer px-3 py-1 hover:bg-gray-600 transition-colors duration-200"
                  onClick={() => {
                    item.onClick();
                    setCtxOpen(false);
                  }}
                >
                  {item.label}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADVANCED CUSTOMIZATION DIALOG */}
      <AnimatePresence>
        {dialogOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeDialog}
          >
            <div
              className="bg-[#1e1e1e] text-white rounded-lg p-6 w-[600px] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4">Title Bar Customization</h2>
              <p className="mb-4 text-sm text-gray-300">
                Select or create custom layouts. Live preview updates when you select a layout.
              </p>

              {/* Preset Layouts */}
              <div className="mb-4">
                <h3 className="font-bold">Presets</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PRESET_LAYOUTS.map((layout) => (
                    <button
                      key={layout.id}
                      className="px-3 py-1 border border-gray-600 rounded hover:bg-gray-700 transition-colors duration-200"
                      onClick={() => handleLayoutSelection(layout)}
                    >
                      {layout.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Layouts (With Delete Option) */}
              <div className="mb-6">
                <h3 className="font-bold">Your Custom Layouts</h3>
                {customLayouts.length === 0 ? (
                  <p className="text-sm text-gray-400">No custom layouts yet.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {customLayouts.map((layout) => (
                      <div
                        key={layout.id}
                        className="flex items-center justify-between px-2 py-1 bg-gray-700/30 rounded hover:bg-gray-700/50 transition-colors duration-200"
                      >
                        <button
                          className="text-left text-sm font-medium flex-1"
                          onClick={() => handleLayoutSelection(layout)}
                        >
                          {layout.label} (Custom)
                        </button>
                        <button
                          className="text-red-400 hover:text-red-300 transition-colors duration-200"
                          onClick={() => handleDeleteLayout(layout.id)}
                          title="Delete Layout"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex space-x-2">
                  <button
                    className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-sm transition-colors duration-200"
                    onClick={handleExport}
                  >
                    Export
                  </button>
                  <button
                    className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-sm transition-colors duration-200"
                    onClick={handleImport}
                  >
                    Import
                  </button>
                </div>
              </div>

              {/* Create New Custom Layout */}
              <form className="mb-4 grid grid-cols-2 gap-2" onSubmit={handleCreateLayout}>
                <div className="flex flex-col">
                  <label className="text-sm">Layout Name:</label>
                  <input
                    type="text"
                    className="bg-gray-700 border-none rounded px-2 py-1 text-sm text-white"
                    value={newLayout.label}
                    onChange={(e) => setNewLayout({ ...newLayout, label: e.target.value })}
                    placeholder="e.g. My Custom Mac"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm">Position (left/right):</label>
                  <select
                    className="bg-gray-700 border-none rounded px-2 py-1 text-sm text-white"
                    value={newLayout.position}
                    onChange={(e) => setNewLayout({ ...newLayout, position: e.target.value })}
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm">Style:</label>
                  <select
                    className="bg-gray-700 border-none rounded px-2 py-1 text-sm text-white"
                    value={newLayout.style}
                    onChange={(e) => setNewLayout({ ...newLayout, style: e.target.value })}
                  >
                    <option value="default">Default (Windows-like)</option>
                    <option value="traffic">Traffic Lights (Mac)</option>
                    <option value="circles">Circles (Linux)</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm">Close Color:</label>
                  <input
                    type="color"
                    className="h-8 w-16"
                    value={newLayout.closeColor}
                    onChange={(e) => setNewLayout({ ...newLayout, closeColor: e.target.value })}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm">Minimize Color:</label>
                  <input
                    type="color"
                    className="h-8 w-16"
                    value={newLayout.minimizeColor}
                    onChange={(e) => setNewLayout({ ...newLayout, minimizeColor: e.target.value })}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm">Maximize Color:</label>
                  <input
                    type="color"
                    className="h-8 w-16"
                    value={newLayout.maximizeColor}
                    onChange={(e) => setNewLayout({ ...newLayout, maximizeColor: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="bg-accent hover:bg-accent-dark px-3 py-1 rounded text-sm self-end mt-auto transition-colors duration-200"
                  >
                    Create
                  </button>
                </div>
              </form>

              <div className="flex justify-end">
                <button
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors duration-200"
                  onClick={closeDialog}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TitleBar;
