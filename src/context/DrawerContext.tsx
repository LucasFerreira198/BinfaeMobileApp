import React, { createContext, useContext, useState } from 'react';

export type ScreenType = 'stock' | 'scanner' | 'cautelas' | 'settings' | 'movements' | 'admin';

interface DrawerContextType {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  activeScreen: ScreenType;
  navigateTo: (screen: ScreenType) => void;
  locationsModalOpen: boolean;
  openLocationsModal: () => void;
  closeLocationsModal: () => void;
  groupsModalOpen: boolean;
  openGroupsModal: () => void;
  closeGroupsModal: () => void;
}

const DrawerContext = createContext<DrawerContextType>({
  isDrawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  activeScreen: 'stock',
  navigateTo: () => {},
  locationsModalOpen: false,
  openLocationsModal: () => {},
  closeLocationsModal: () => {},
  groupsModalOpen: false,
  openGroupsModal: () => {},
  closeGroupsModal: () => {},
});

export const DrawerProvider: React.FC<{
  children: React.ReactNode;
  activeScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
}> = ({ children, activeScreen, onNavigate }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [locationsModalOpen, setLocationsModalOpen] = useState<boolean>(false);
  const [groupsModalOpen, setGroupsModalOpen] = useState<boolean>(false);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const navigateTo = (screen: ScreenType) => {
    onNavigate(screen);
    setIsDrawerOpen(false);
  };

  const openLocationsModal = () => {
    setIsDrawerOpen(false);
    setLocationsModalOpen(true);
  };

  const closeLocationsModal = () => {
    setLocationsModalOpen(false);
  };

  const openGroupsModal = () => {
    setIsDrawerOpen(false);
    setGroupsModalOpen(true);
  };

  const closeGroupsModal = () => {
    setGroupsModalOpen(false);
  };

  return (
    <DrawerContext.Provider
      value={{
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        activeScreen,
        navigateTo,
        locationsModalOpen,
        openLocationsModal,
        closeLocationsModal,
        groupsModalOpen,
        openGroupsModal,
        closeGroupsModal,
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
};

export const useDrawer = () => useContext(DrawerContext);
