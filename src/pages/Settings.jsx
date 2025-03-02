import React from 'react';

const Settings = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="bg-surface rounded-lg p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Account Settings</h3>
            {/* Add account settings options */}
          </div>
          <div>
            <h3 className="text-lg font-medium mb-4">Audio Settings</h3>
            {/* Add audio settings options */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
