# Detailed screen and interaction guide

## 1. Shared display shell and navigation

The display shell contains campaign branding, a current-screen heading, the presentation stage, and a recent-recognition rail on applicable scenes. The local toolbar is a preview aid, not an admin control panel. Click-to-next excludes buttons, links, inputs, selects, textareas, and selected text. Right Arrow and Space also advance when focus is outside interactive controls.

The screen picker bypasses the need to wait through the playlist. Pause holds the presentation clock and CSS animation state. Full screen uses the browser fullscreen API. The preview honors reduced-motion preferences. Its controls do not save owner settings or change audience access.

Title treatments deliberately vary: Garden and arrival retain shimmer; Featured uses an entrance lift and dimensional shadow; Spotlight uses a soft lighting cycle; Nine Expressions and Shared Expression use a quieter entrance reveal. Small headings remain still. The campaign brand retains shimmer across scenes.

## 2. Recognition Garden

Garden circles use layered radial and linear shading, inset highlights, luminous rims, and perspective-based float. The content remains in an elevated inner plane. Root corrected the initial rim implementation so color stayed at the edge instead of forming a rotating pie-like fill across the text. The orbit radius was also corrected from a percentage of the tiny particle to a container-relative size.

The first version had conspicuous orbiting hearts. The refinement keeps a small luminous glint instead, matching the request for subtler decoration. Still and paused modes suppress or freeze these animations. Garden content continues to come from the existing eligibility and selection logic.

## 3. Featured recognition

The left expression circle acts as a dimensional keepsake with three tilted orbit rings and a small heart accent. Lighting comes from gradients and inset shadows. The reading card has offset layers beneath it, giving it thickness, with gentle vertical movement. Pointer position adds a small horizontal-axis viewing response to the expression object.

The recipient, full message, associated expression pills, and existing reading-page behavior are preserved. The geometry is decorative; it does not replace the message with an image or a canvas. The screen remains selectable and navigable through the same coordinator.

## 4. Shared Expression

The earlier connected-recognition layout stretched bubbles into horizontal ovals and could leave a single recognition isolated on one side. The revised layout explicitly controls aspect ratio, centers a flexible circle group, and gives the shared phrase its own companion region.

Each circle has centered name/message content, a shaded shell, a thin breathing halo, and a slow rim glint. Message font size decreases for longer messages. The shared phrase still uses the existing ribbon-heart reveal and principle text. A single sample circle was observed with matching 324-pixel inner width and height at 1920 by 1080.

Limitation: maximum-length names/messages and unusually large connected groups have not been exhaustively revalidated for this refinement. The decorative halo increases scroll bounds, so scroll-height checks alone cannot distinguish decoration from clipped text. A successor should inspect actual text bounds and multi-recognition layouts before a release.

## 5. Monthly impact

This screen retains the baseline animated total and nine ribbon counts. The local overlay adds only a brief response to scene entry; it does not continuously rain particles over the figures. Counts are derived from the synthetic aggregate during preview. This screen was not structurally redesigned in the latest refinement.

## 6. The nine expressions

The existing narrative begins with a radial flower and unfolds into nine expression cards. The rework retains official order, full phrases, and principle text. The settled cards have beveled-looking edges, offset depth shadows, an inset outline, staggered tilt/float, and slow moving highlights.

The three-by-three layout remains intentionally readable. This is a dimensional card treatment, not a replacement with a spinning 3D carousel that hides most phrases. Ambient card motion is separate from the narrative clock so it does not jump every 500 milliseconds.

## 7. Expression Spotlight

The nine-petal expression wheel is now treated as a kinetic flower sculpture. Petals and core use inset highlights and dimensional shadows. Two tilted rings rotate around it; the sculpture sways slowly in depth. The reading region remains steady except for a small pointer-responsive tilt.

The baseline phases still reveal the teaching label, expression phrase, principle, and everyday example. Existing full expression copy is retained. The title has a soft illumination cycle rather than the same shimmer used everywhere. Later narrative phases intentionally de-emphasize the flower so reading takes priority.

## 8. Daily Practice

Daily Practice retains its baseline single-expression presentation and invitation. The local shell provides its scene-entry response and navigation. The existing official form destination is preserved. This local design does not submit that form, change its content, or modify its hosting.

## 9. One Kind Word

The baseline sequence includes luminous copy and garden-color ripples. The current design keeps that narrative and adds only the restrained scene-entry response from the shell. It is not a new implementation of the underlying teaching sequence.

## 10. Everyday Peace

The baseline sequence presents one location at a time: home, school, and work. The prior integration corrected the layout to give each location a full reading interval instead of showing an overcrowded triptych. The local refinement preserves that behavior and its approved phrase associations.

## 11. Peace Promise

The baseline abstract hands and ribbon-circle sequence leads to the official invitation. The local refinement preserves the teaching journey and QR behavior. The preview does not verify a physical phone scan or submit a promise.

## 12. New-recognition arrival

Click **Preview new arrival**, the purple button above the bottom controls. It creates a synthetic Sample friend recognition with a thank-you message and expressions 6 and 8. The sample aggregate is updated consistently and a new publication event is delivered to the display coordinator.

The actual arrival sequence plays: a new moment enters, the recipient/message/expressions are shown, the finite particles fade, reading time completes, and the record appears in the garden. The preview starts queued arrivals promptly for demonstration; production scheduling still has its existing timing. While an arrival is active, the demo button is disabled. Manual next completes the active sample arrival so it does not immediately restart from the queue.

This demonstrates display presentation after publication. It does not demonstrate submission checks, moderation, held content, network delivery, a real visitor's form, or production audio.
