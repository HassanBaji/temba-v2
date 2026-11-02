# Design copy, verbatim from `Sign up flow v2.dc.html` and `Home screen.dc.html`

All frames are 390px wide. Headings 32px bold tight; sub-copy 15px muted; fields 52px, 12px radius; one primary ink button pinned at the bottom; secondary "Not now" as a text link under it. Progress: thin segments under the header, step counter top right in mono eyebrow ("STEP 1 OF 2", "PROFILE / PHOTO", "2 OF 7 DONE").

## 00a Welcome (black screen)
TEMBA wordmark. Headline: "Find a game, / fill the court, / keep the score." Sub: "Open padel and football games near you, your regular groups, and a level that follows your results." Decorative strip "TONIGHT, KARBABAD 9:00 PM" with three initials tiles and one hatched "1 open" (fixed content, not live). Buttons: white primary "Continue with phone" (phone icon), then "Apple" and "Google" side by side (ship Google only). Microcopy: "By continuing you agree to the Terms and Privacy Policy."

## 00b Your number
Back arrow. Title "What's your number?" Sub "We text a six digit code to confirm it's you. If the number is new to us, we create your account." Field "Mobile number" with +973 country segment. Primary "Send code". Microcopy "Standard SMS rates may apply. By continuing you agree to the Terms and Privacy Policy." OR divider, "Continue with Google". Footer rule: "Invited to a group?" left, "Open the link" right.

## 00c Verify number
Back arrow. Title "Enter the code". Sub "Sent to +973 3612 4408. Change number". Six-cell code input. Row: "Resend code" left, countdown "0:24" right. Primary "Verify" disabled until six digits, helper "Button unlocks at six digits. Known numbers go straight to Home." Footer: hatch swatch + "Codes expire after ten minutes. Three wrong tries locks the number for an hour." (Keep the existing shipped wording for this footer; Clerk owns the policy.)

## 00d Your name (new numbers only)
Back arrow, "STEP 1 OF 2". Title "What should we call you?" Sub "Shown to organizers and the people you play with." Fields "First name", "Last name". Preview card: initials tile (ink), "Mikael Karlsson", phone under it, "PREVIEW" eyebrow right. Primary "Continue". Microcopy "Photo, email, sports and level can be added later from Profile."

## 00e Password
Back arrow, "STEP 2 OF 2". Title "Pick a password". Sub "For signing in on a new phone." Field "Password" (placeholder "At least 8 characters", eye toggle), four strength segments under it, hint "At least 8 characters. Mix in a number or symbol to make it strong." Primary "Create account" (disabled until 8+ chars). Microcopy "You can change it later from Settings."

## 00f You're in
"Skip" top right. Ink initials tile. Title "You're in, Mikael." Sub "Your account works as it is. A fuller profile gets you matched games, a rating and receipts by email. Five short tasks, any order." (Ours: three tasks; use `checklistBlurb`.) Row "Profile" left, "2 OF 7" right, segments. Task rows: circle marker, title, time right ("1 min"). Primary "Complete profile", secondary outline "Later, show me games".

## 01a Complete your profile
Back, "2 OF 7 DONE", segments. Title "Complete your profile". Sub from `checklistBlurb`. Section "Done at sign up": rows "Name — Mikael Karlsson", "Mobile number — +973 3612 4408" with filled check markers. Section "Tasks": rows with title, description, chevron; done rows get a filled marker and muted strikethrough. Primary "Continue to games" / "Find games" when complete.

## 01b Profile photo
Back, "PROFILE / PHOTO". Title "Add a photo". Sub "A clear face shot helps organizers spot you at the court. Shown to group members and people in your games." Large hatched circle "profile photo" placeholder (shows the chosen image once picked). "Until then you show as MK". Buttons: outline "Take a photo", outline "Choose from library" (web: one "Choose a photo" file input). Primary "Save photo", link "Not now".

## 01c Email
Back, "PROFILE / EMAIL". Title "Add your email". Sub "For booking receipts, and a way back into your account if you change number. We send a six digit code to confirm it." Field "Email". Primary "Send code". Three benefit rows (icon + bold lead): "Receipts. Every booking and seat payment, in your inbox." "Recovery. Sign in by email if your number changes." "Private. Never shown to other members." Link "Not now".

## 01d Verify email
Title "Check your inbox". Sub "Code sent to mikael.karlsson@gmail.com. Change email". Six-cell code. "Resend code" / countdown. Primary "Verify email". Helper "Check spam if nothing arrives in a minute." Footer "Until verified, the email is saved but unused."

## 01f–01h Sports and level
Existing questionnaire screens, eyebrow "PROFILE / SPORTS 1 OF 3". "What do you play?" "Pick one or both. Each sport keeps its own level and its own games list." Padel: "Where would you place yourself?" "A starting point only. Twenty rated matches confirm it." Football: "How do you line up?" "Organizers use this to balance teams. You can change it per game." Last step's primary is "Save sports" and returns to the checklist (no "You're set" screen).

## Home card (3a / 3b)
Header shows the full name ("Hassan Haji"). Card under the header: title "Complete your profile", "2 OF 7" mono right, seven thin segments, up to three task rows (circle marker, title, description, chevron), footer row "2 more tasks →" left and "Skip for now" right. Collapsed state after skip: a one-line chip "Profile 2 OF 7 · Show" with the open tasks' short names ("Photo", "Email", "Sports"). The card disappears when every task is done.
