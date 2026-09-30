# Jozzy's Closet

React + Vite storefront with Supabase (database, auth, image storage).

## 1. Supabase
1. Create a project at supabase.com.
2. SQL Editor: paste and run `supabase/schema.sql`.
3. Authentication > Providers > Email: turn OFF "Allow new users to sign up".
4. Authentication > Users > Add user: create your admin email and password.
5. SQL Editor: `insert into admins (user_id) select id from auth.users where email = 'YOUR-ADMIN-EMAIL';`
6. Settings > API: copy the Project URL and anon public key.

## 2. Run locally
    cp .env.example .env     # paste the URL and anon key
    npm install
    npm run dev

## 3. Deploy (Vercel or Netlify)
Import the repo, add the two `VITE_` variables, build command `npm run build`, output `dist`.
Then add `jozzyscloset.com` under the host's Domains settings and update your DNS as it instructs.
`vercel.json` and `public/_redirects` already handle page refreshes on /cart and /admin.

## Using the site
- Admin: click "Admin" in the footer, sign in. Orders tab: match the customer's reference to your payment, then Confirm or Reject.
- Items tab: add (photo, name, price) or delete. Payment tab: edit account details and the delivery note.
