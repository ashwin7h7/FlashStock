# FlashStock
A high-performance real-time auction platform built with the MERN stack

## Testing Multiple Users

This app uses **httpOnly cookie-based JWT authentication**. All tabs in the same
browser profile share one cookie, so logging in as a second user in another tab
will overwrite the first session.

To test multiple users at the same time (e.g. two buyers bidding):

- **Chrome + Firefox** — open each user in a different browser
- **Incognito / Private window** — each incognito window has its own cookie jar
- **Browser profiles** — Chrome profiles have separate cookies

This is standard behavior for cookie-based auth and is not a bug.
