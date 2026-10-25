# Floating mobile navigation

The existing four destinations remain unchanged. Up to 640px, navigation is a translucent, rounded floating dock with a 12px outer inset, a soft shadow and restrained selected pill. The dock is centred and capped at 420px. Dark/light surfaces use the existing theme tokens.

Touch targets are at least 54px high; the smallest tested width (320px) leaves each target approximately 64px wide. Bottom positioning includes the system safe-area inset. Content, scroll padding and toast position leave room for the dock. Existing reduced-motion rules disable the colour transitions.

Browser QA: all four destinations clicked; dark/light screenshots reviewed; 320, 375, 390, 430 and 640px checked with no document overflow. Desktop navigation is unchanged. Physical home-indicator/keyboard behaviour is not claimed as device-tested.
