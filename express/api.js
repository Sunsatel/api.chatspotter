const express = require("express");
const router = express.Router();
const serverless = require("serverless-http");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const Stripe = require("stripe");
const axios = require("axios");
//import supabase from './src/components/supabaseClient'
const { createClient } = require("@supabase/supabase-js");
// const stripe = Stripe("sk_test_61vDJj4xyA40vE0TdTFg5lQe00840D9EzQ"); //Stripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
const stripe = Stripe(process.env.VITE_STRIPE_PUBLIC_KEY); //Stripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
const app = express();

// Replace the placeholders with your own Supabase credentials
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GOOGLE_API = "AIzaSyDgt9I--BmAa2x0PtTnvSh-rvwuS5-XrEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    detectSessionInUrl: true,
  },
});

//app.use(express.json());
app.use((req, res, next) => {
  res.append("Access-Control-Allow-Origin", ["*"]);
  res.append("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.append("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    allowedHeaders: ["Content-Type", "Authorization", "Encoded-Text"],
  })
);
app.use(
  session({
    secret: "thisIsMySecret13",
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
    resave: false,
  })
);
app.use(cookieParser());
// Use the router to handle requests to the `/.netlify/functions/server` path
app.use(`/.netlify/functions/api`, router);

const YOUR_DOMAIN_BILLING = "http://localhost:3001/billing";
// the below succes page is on the server so
// we can capture Stripe created user info
const DOMAIN = "http://localhost:4001";

/*
 88888888b dP     dP 888888ba   a88888b. d888888P dP  .88888.  888888ba  .d88888b
 88        88     88 88    `8b d8'   `88    88    88 d8'   `8b 88    `8b 88.    "'
a88aaaa    88     88 88     88 88           88    88 88     88 88     88 `Y88888b.
 88        88     88 88     88 88           88    88 88     88 88     88       `8b
 88        Y8.   .8P 88     88 Y8.   .88    88    88 Y8.   .8P 88     88 d8'   .8P
 dP        `Y88888P' dP     dP  Y88888P'    dP    dP  `8888P'  dP     dP  Y88888P

 */

// Define a route that responds with a JSON object when a GET request is made to the root path
router.get("/", (req, res) => {
  res.json({
    hello: "hi!",
  });
});

async function getTimezoneFromPostalCode(postalCode) {
  try {
    // Step 1: Geocode postal code to obtain coordinates
    const geocodeResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        postalCode
      )}&key=${GOOGLE_API}`
    );
    //console.log('google get geocode with postalcode '+postalCode+': ',geocodeResponse)

    const location = geocodeResponse.data.results[0].geometry.location;
    const { lat, lng } = location;
    console.log("func_ lat long: ", location);
    console.log("func_ lat", lat);
    console.log("func_ long", lng);

    // Step 2: Retrieve timezone based on coordinates
    const timezoneResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${Math.floor(
        Date.now() / 1000
      )}&key=${GOOGLE_API}`
    );

    //console.log('func_ the timezoneResponse:', timezoneResponse)

    const time_zone = timezoneResponse.data.timeZoneId; // [0] name America/Detroit
    const time_zone_offset_hr = timezoneResponse.data.dstOffset; // [1] 3600
    const timezone = [time_zone, time_zone_offset_hr];
    console.log("func_ timezone: ", time_zone);
    console.log("func_ offset_hr", time_zone_offset_hr);

    return timezone;
  } catch (error) {
    console.error("func_ Error:", error);
    return null;
  }
}

/*
 .d8888b.888888888888888888b. 88888888888888b. 8888888888
d88P  Y88b   888    888   Y88b  888  888   Y88b888
Y88b.        888    888    888  888  888    888888
 "Y888b.     888    888   d88P  888  888   d88P8888888
    "Y88b.   888    8888888P"   888  8888888P" 888
      "888   888    888 T88b    888  888       888
Y88b  d88P   888    888  T88b   888  888       888
 "Y8888P"    888    888   T88b8888888888       8888888888
*/

/*
     d8'          dP                         dP                           dP
    d8'           88                         88                           88
   d8'   .d8888b. 88d888b. .d8888b. .d8888b. 88  .dP  .d8888b. dP    dP d8888P
  d8'    88'  `"" 88'  `88 88ooood8 88'  `"" 88888"   88'  `88 88    88   88
 d8'     88.  ... 88    88 88.  ... 88.  ... 88  `8b. 88.  .88 88.  .88   88
88       `88888P' dP    dP `88888P' `88888P' dP   `YP `88888P' `88888P'   dP
 */
router.post("/stripe/create-checkout-session", cors(), async (req, res) => {
  console.log("key: ", req.body.lookup_key);
  const price_key = req.body.lookup_key;
  const prices = await stripe.prices.retrieve(req.body.lookup_key);
  console.log(prices);

  const session = await stripe.checkout.sessions.create({
    billing_address_collection: "auto",
    line_items: [
      {
        price: prices.id,
        // For metered billing, do not pass quantity
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${DOMAIN}/stripe/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${DOMAIN}/cancel.html`,
    subscription_data: {
      trial_period_days: 7,
    },
    automatic_tax: { enabled: true },
  });

  res.redirect(303, session.url);
});

/*
     d8'
    d8'
   d8'   .d8888b. dP    dP .d8888b. .d8888b. .d8888b. .d8888b. .d8888b.
  d8'    Y8ooooo. 88    88 88'  `"" 88'  `"" 88ooood8 Y8ooooo. Y8ooooo.
 d8'           88 88.  .88 88.  ... 88.  ... 88.  ...       88       88
88       `88888P' `88888P' `88888P' `88888P' `88888P' `88888P' `88888P'
 */

router.get("/stripe/success.html", async (req, res) => {
  /*
   *  Stripe has been successful and is redirecting
   *  the result here
   *
   *  Add the data into public.stripe
   *  Add subset to public.profile
   *  Create a new Supabase row auth.user
   *    - this sends a confirmation email
   *    - when confirmed user is redirected to dashboard
   */
  //session = req.session

  async function getAuthSignup(email) {
    // Step one of creating a new user in supabase
    // adds row to auth.users with autogenerated id
    // and passing in email and random password
    console.log("func_ getAuthSignup email: ", email);
    const randomFourDigitNumber = Math.floor(1000 + Math.random() * 9000);
    let temp_password = "Skynet-" + randomFourDigitNumber;
    console.log("temp_password: ", temp_password);

    const { data, error } = await supabase.auth.signUp({
      email: customer.email,
      password: temp_password,
    });
    if (error) {
      console.error("SignUp error: ", error);
    } else {
      console.log("Sign-Up user id: ", data);
    }
    return data;
  }

  async function supabaseTimezones(tz_id) {
    try {
      console.log("func_supabaseTimezones tz_id:", tz_id);
      let { data, error } = await supabase
        .from("time_zones")
        .select("*")
        .eq("name", tz_id);

      if (error) {
        console.error("Error:", error);
        return null;
      } else if (data && data.length > 0) {
        const timezone = data[0];
        console.log("time_offset:", timezone.offset_hr);
        console.log("timezone id:", timezone.id);

        const timezoneArray = [timezone.offset_hr, timezone.id];
        return timezoneArray;
      } else {
        console.log("No matching timezone found.");
        return null;
      }
    } catch (error) {
      console.error("supabaseTimezones Exception:", error);
      return null;
    }
  }

  async function setNewProfileUser(array) {
    // Step 3: create a new public.profiles
    /*
       *  2.INSERT new customer's Stripe data into public.profiles
       *    3. call auth.signUp

        const profile_data =  {
          "id":authUserId.user.id,
          "username":customer.email,
          "first_name":fullname[0],
          "last_name": fullname[1],
          "full_name": customer.name,
          "tokens_cummulative":1000000,
          "renewal_date":formattedDate,
          "renewal_amount": renew_amount,
          "time_zone":timezone[0],
          "time_zone_offset_hr":timezone[1],
          "time_zone_id":timezone_array[1],               // public.time_zones.id
          "sripe_id": customer.id
        }
       */
    try {
      // configure data to input into public.profiles
      const updated = new Date().toISOString().replace("T", " ");

      const profile_data = {
        username: array.username,
        first_name: array.first_name,
        last_name: array.last_name,
        full_name: array.full_name,
        tokens_cummulative: array.tokens_cummulative,
        renewal_date: array.renewal_date,
        renewal_amount: array.renewal_amount,
        time_zone: array.time_zone,
        time_zone_offset_hr: array.time_zone_offset_hr,
        time_zone_id: array.time_zone_id,
        stripe_id: array.stripe_id,
        updated_at: updated,
      };

      console.log("func_ setNewProfileUser array: ", array);
      let { data, error } = await supabase
        .from("profiles")
        .update(profile_data)
        .eq("id", array.id)
        .select("id");

      if (error) {
        console.log("Profile Creation FAILED:", error);
      } else {
        console.log("Profile Created:", data);
        return data;
      }
    } catch (error) {
      console.error("setNewProfileUser Exception:", error);
      return null;
    }
  }

  /*
   *  1. INSERT CUSTOMER DATA INTO public.stripe
   *     2. insert subset into public.profiles
   *     3. call auth.signUp
   */
  // Define the table name and data for insertion
  async function saveStripeToSupabase(customer) {
    try {
      const data = {
        id: customer.id,
        full_name: customer.name,
        email: customer.email,
        address_city: customer.address.city,
        address_country: customer.address.country,
        address_line1: customer.address.line1,
        address_line2: customer.address.line2,
        address_postal: customer.address.postal_code,
        address_state: customer.address.state,
      };

      const response = await supabase.from("stripe").insert(data);

      console.log("Stripe Insert successful", response);
    } catch (error) {
      console.error("Stripe Insert FAILED:", error);
    }
  }

  /*
.d88888b  d888888P  .d888888   888888ba  d888888P
88.    "'    88    d8'    88   88    `8b    88
`Y88888b.    88    88aaaaa88a a88aaaa8P'    88
      `8b    88    88     88   88   `8b.    88
d8'   .8P    88    88     88   88     88    88
 Y88888P     dP    88     88   dP     dP    dP
 */
  // START PAGE HERE

  const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
  const customer = await stripe.customers.retrieve(session.customer);

  console.log("stripe returned customer: ", customer);

  // Create a new Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    detectSessionInUrl: true,
  });

  /*
stripe returned customer:  {
  id: 'cus_OE7nzRbM0E4LRb',
  object: 'customer',
  address: {
    city: 'holland',
    country: 'US',
    line1: 'po box 1636',
    line2: null,
    postal_code: '49422',
    state: 'MI'
  },
  balance: 0,
  created: 1688839666,
  currency: 'usd',
  default_source: null,
  delinquent: false,
  description: null,
  discount: null,
  email: 'dobb34@oursmtp.com',
  invoice_prefix: 'DB96F5BA',
  invoice_settings: {
    custom_fields: null,
    default_payment_method: null,
    footer: null,
    rendering_options: null
  },
  livemode: false,
  metadata: {},
  name: 'Smitty Smith',
  next_invoice_sequence: 2,
  phone: null,
  preferred_locales: [ 'en-US' ],
  shipping: null,
  tax_exempt: 'none',
  test_clock: null
}
*/

  /*
   *  2. Create a new user on supabase.
   *     This info will be put into auth.users
   */
  async function createNewChatSpotterUser() {
    try {
      //
      const stripeCustomer = await saveStripeToSupabase(customer);

      // create new user in supabase auth.users.id
      const authUserId = await getAuthSignup(customer.email); // auth.users.id
      console.log("mainFunc_ authUserId: ", authUserId.user.id); // authUserId.user.id

      // Get the current Date
      const currentDate = new Date();
      // Add 7 days to the current date to account for trial period
      const futureDate = new Date(
        currentDate.getTime() + 7 * 24 * 60 * 60 * 1000
      );
      // Format the future date as a PostgreSQL date string (YYYY-MM-DD)
      const formattedDate = futureDate.toISOString().split("T")[0];

      const fullname = customer.name.split(" "); // first_name,last_name

      const timezone = await getTimezoneFromPostalCode(
        customer.address.postal_code
      ); //array of time_zone,time_zone_offset_hr
      console.log("mainFunc_ Timezone:", timezone[0]);
      console.log("mainFunc_ Timezone offset:", timezone[1]);

      const timezone_array = await supabaseTimezones(timezone[0]); // [0]timezone_offest, [1]timezone_id
      console.log("mainFunc_ timezone_array:", timezone_array);

      let renew_amount;

      if (customer.description === "basic") {
        renew_amount = 5000000;
      } else if (customer.description === "mid") {
        renew_amount = 10000000;
      } else if (customer.description === "business") {
        renew_amount = 20000000;
      } else {
        renew_amount = 1000000;
      }

      const profile_data = {
        id: authUserId.user.id,
        username: customer.email,
        first_name: fullname[0],
        last_name: fullname[1],
        full_name: customer.name,
        tokens_cummulative: 1000000,
        renewal_date: formattedDate,
        renewal_amount: renew_amount,
        time_zone: timezone[0],
        time_zone_offset_hr: timezone[1],
        time_zone_id: timezone_array[1], // public.time_zones.id
        stripe_id: customer.id,
      };
      console.log("mainFunc_ profile_data", profile_data);
      const newProfile = await setNewProfileUser(profile_data);
      console.log("mainFunc_ newProfile resultant data:", newProfile);
    } catch (error) {
      console.error("SignUp exception: ", error);
    }
    // send thank you page
    res.send(
      `<html><body><h1>Thanks for your order, ${customer.name}!</h1><p>Please check your email for a confirmation link.</p></body></html>`
    );
  }
  createNewChatSpotterUser();
});

/*
     d8'                              dP            dP
    d8'                               88            88
   d8'   88d888b. .d8888b. 88d888b. d8888P .d8888b. 88
  d8'    88'  `88 88'  `88 88'  `88   88   88'  `88 88
 d8'     88.  .88 88.  .88 88         88   88.  .88 88
88       88Y888P' `88888P' dP         dP   `88888P8 dP
         88
         dP
*/
router.post("/stripe/create-portal-session", cors(), async (req, res) => {
  console.log("in create-portal-session");
  const prices = await stripe.prices.list({
    lookup_keys: [req.body.lookup_key],
    expand: ["data.product"],
  });
  const session = await stripe.checkout.sessions.create({
    billing_address_collection: "auto",
    line_items: [
      {
        price: prices.data[0].id,
        // For metered billing, do not pass quantity
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${YOUR_DOMAIN_BILLING}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${YOUR_DOMAIN_BILLING}?canceled=true`,
    subscription_data: {
      trial_period_days: 7,
    },
    automatic_tax: { enabled: true },
  });

  res.redirect(303, session.url);
});

/*
     d8'                     dP       dP                         dP
    d8'                      88       88                         88
   d8'   dP  dP  dP .d8888b. 88d888b. 88d888b. .d8888b. .d8888b. 88  .dP
  d8'    88  88  88 88ooood8 88'  `88 88'  `88 88'  `88 88'  `88 88888"
 d8'     88.88b.88' 88.  ... 88.  .88 88    88 88.  .88 88.  .88 88  `8b.
88       8888P Y8P  `88888P' 88Y8888' dP    dP `88888P' `88888P' dP   `YP
*/
router.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  (request, response) => {
    let event = request.body;
    // Replace this endpoint secret with your endpoint's unique secret
    // If you are testing with the CLI, find the secret by running 'stripe listen'
    // If you are using an endpoint defined with the API or dashboard, look in your webhook settings
    // at https://dashboard.stripe.com/webhooks
    const endpointSecret = "whsec_12345";
    // Only verify the event if you have an endpoint secret defined.
    // Otherwise use the basic event deserialized with JSON.parse
    if (endpointSecret) {
      // Get the signature sent by Stripe
      const signature = request.headers["stripe-signature"];
      try {
        event = stripe.webhooks.constructEvent(
          request.body,
          signature,
          endpointSecret
        );
      } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message);
        return response.sendStatus(400);
      }
    }
    let subscription;
    let status;
    // Handle the event
    switch (event.type) {
      case "customer.subscription.trial_will_end":
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Subscription status is ${status}.`);
        // Then define and call a method to handle the subscription trial ending.
        // handleSubscriptionTrialEnding(subscription);
        break;
      case "customer.subscription.deleted":
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Subscription status is ${status}.`);
        // Then define and call a method to handle the subscription deleted.
        // handleSubscriptionDeleted(subscriptionDeleted);
        break;
      case "customer.subscription.created":
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Subscription status is ${status}.`);
        // Then define and call a method to handle the subscription created.
        // handleSubscriptionCreated(subscription);
        break;
      case "customer.subscription.updated":
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Subscription status is ${status}.`);
        // Then define and call a method to handle the subscription update.
        // handleSubscriptionUpdated(subscription);
        break;
      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.type}.`);
    }
    // Return a 200 response to acknowledge receipt of the event
    response.send();
  }
);

/*
dP dP   dP  a8888a   a8888a  d88
88 88   88 d8' ..8b d8' ..8b  88
   88aaa88 88 .P 88 88 .P 88  88
        88 88 d' 88 88 d' 88  88
dP      88 Y8'' .8P Y8'' .8P  88
88      dP  Y8888P   Y8888P  d88P

app.listen(4001, () => {
  console.log('Server listening on port 4001!');
});
 */
module.exports = app;
module.exports.handler = serverless(app);
