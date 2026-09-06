import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

import { useNotifications } from '@/contexts/notifications-context';
import { useTheme } from '@/hooks/use-theme';

// Hiding NativeTabs (an unstable API) at the exact instant the keyboard
// finishes opening once raced against KeyboardAvoidingView's own resize
// animation on the Tasks screen, breaking touch on the compose bar's send
// button right when the two competed for layout in the same tick. Delaying
// the hide lets that animation settle first; hiding immediately on close
// avoids a lag once you're done typing.
function useHideTabBarOnKeyboard() {
  const [hidden, setHidden] = useState(false);
  const showTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      showTimeout.current = setTimeout(() => setHidden(true), 250);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      if (showTimeout.current) clearTimeout(showTimeout.current);
      setHidden(false);
    });
    return () => {
      if (showTimeout.current) clearTimeout(showTimeout.current);
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return hidden;
}

export default function AppTabs() {
  const colors = useTheme();
  const { unreadCount } = useNotifications();
  const tabBarHidden = useHideTabBarOnKeyboard();

  return (
    <NativeTabs
      hidden={tabBarHidden}
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'checklist', selected: 'checklist' }} md="checklist" />
        {unreadCount > 0 && <NativeTabs.Trigger.Badge>{String(unreadCount)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="group">
        <NativeTabs.Trigger.Label>Group</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'clock', selected: 'clock.fill' }} md="history" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
