# Decisions and next design review

## 1. Decisions to preserve

The prototype stays local. The display should be expressive but readable. New motion should respond to an event or reinforce a scene, rather than add constant random decoration. Title treatments may differ by screen. Full expression phrases and official ordering remain intact. Preview arrivals are simulated, never seeded in production. A prominent arrival control is a usability requirement, not a temporary debugging detail to remove without discussion.

CSS dimensional geometry was chosen for this iteration to avoid introducing another runtime and model asset pipeline. If Anthony wants a true 3D model next, make that a concrete design choice: identify the object, its purpose, how copy stays readable, and the TV performance budget. Do not call the current CSS geometry a physical 3D model.

## 2. Corrections already made

The first particle overlay was too continuous and prominent; it was replaced by finite responses. A small inline arrival button was hard to find; it was moved above the toolbar and made larger. Shared bubbles were oval because their geometry followed content; explicit equal geometry now controls their shape. Garden rim gradients initially colored the interior; masking now confines the highlight to the ring. Ambient animations should not be synchronized at coarse presentation-clock ticks.

## 3. Most useful next review

There is no authorized next implementation task at this checkpoint. When Anthony resumes, review the saved design together and focus on the specific next request. Potential questions are whether the dimensional Featured/Spotlight treatment is strong enough, whether a true 3D object is wanted, whether the nine-card composition should change beyond styling, and whether the arrival sequence has the desired emotional emphasis.

Those are product choices, not reasons to restart the full interview. The next technical work should be bounded to the answer and preserve the current preview until a replacement is reviewable.

## 4. Saved versus approved

Saved means source, documentation, and evidence are captured at a recoverable checkpoint. Verified means the particular checks listed in the verification document passed. Approved means Anthony accepts a specific design direction; that has not been newly established for all final refinements. Deployed means a production release occurred; this design was not deployed. Keep those terms distinct in future status reports.
