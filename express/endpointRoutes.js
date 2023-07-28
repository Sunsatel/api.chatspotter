import express from 'express'
import fetch from 'node-fetch'
import bodyParser from 'body-parser'
import cors from 'cors'
import { Buffer } from 'buffer'
import Stripe from 'stripe'
const stripe = Stripe('sk_test_61vDJj4xyA40vE0TdTFg5lQe00840D9EzQ');
//const app = express();
const router = express.Router();


router.use(express.json());

router.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
router.use(bodyParser.json());
router.use(express.urlencoded({ extended: true }));
router.use(cors({
   allowedHeaders: ['Content-Type', 'Authorization', 'Encoded-Text'],
}))



const YOUR_DOMAIN_BILLING = 'http://localhost:3000/billing';


router.post('/api/chat', cors(), async (req, res) => {

  let chat = req.body
  console.log('server req.body', chat)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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',
        'OpenAl-Organization': 'org-RlWvbxagT5FGFUtvXZUpebjD',
    },
    body: JSON.stringify(chat)

  });
  const data = await response.json();
  console.log('ai data',data) //.choices[0].message.content) // successfully outputs the response
  res.send(data); // return to app
});


router.post('/api/grammar', cors(), async (req, res) => {

   let text = req.body.text
   console.log('Text to check: ', text)

   // Make API call
   // new through 8/23: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0eXAiOiJhY2Nlc3MiLCJ2IjozLCJzdWIiOiIwOWJmZDA2Ny0yZDRlLTRmYzQtOWQzMy00MmExOTUyZjk1NjEiLCJpc3MiOjE2NjU2NTQ5NjYsImV4cCI6MTY5MDg0MDgwMCwiZmxhZ3MiOjEsImNvbXBhbnlJZCI6IjVlODEwNzg0LWRmMmEtNDdjZC05MmFjLTk5MzhkNzhkOWNlNSIsImlzQ29tcGFueUFkbWluIjp0cnVlLCJoYXNBY2Nlc3NUb1NlcnZpY2UiOnRydWUsImlzUHJlbWl1bU9ubHkiOnRydWUsImhhc1ByZW1pdW1BY2Nlc3MiOnRydWUsInJlcXVpcmVTdWJzY3JpcHRpb24iOmZhbHNlLCJhY2Nlc3NFbmRzQXQiOjE4NTU3NTIzNzl9.1USLGIPZ6gxpywoch0ZFqKagXjQKLPmCwmbR_c0qNM8
   try {
     const response = await fetch('https://api.linguix.com/api/v1/checker', {
       method: 'POST',
       headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0eXAiOiJhY2Nlc3MiLCJ2IjozLCJzdWIiOiIwOWJmZDA2Ny0yZDRlLTRmYzQtOWQzMy00MmExOTUyZjk1NjEiLCJpc3MiOjE2NjU2NTQ5NjYsImV4cCI6MTY5MDg0MDgwMCwiZmxhZ3MiOjEsImNvbXBhbnlJZCI6IjVlODEwNzg0LWRmMmEtNDdjZC05MmFjLTk5MzhkNzhkOWNlNSIsImlzQ29tcGFueUFkbWluIjp0cnVlLCJoYXNBY2Nlc3NUb1NlcnZpY2UiOnRydWUsImlzUHJlbWl1bU9ubHkiOnRydWUsImhhc1ByZW1pdW1BY2Nlc3MiOnRydWUsInJlcXVpcmVTdWJzY3JpcHRpb24iOmZhbHNlLCJhY2Nlc3NFbmRzQXQiOjE4NTU3NTIzNzl9.1USLGIPZ6gxpywoch0ZFqKagXjQKLPmCwmbR_c0qNM8',
       },
       body: JSON.stringify({ text }),
     })

     const data = await response.json()
     console.log('Grammar response: ', data)
     res.send(data)

   } catch (error) {
     console.error('ERROR during grammar checker', error)
     res.status(500).send({ error: 'An error occurred' })
   }
})

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
         dP                         dP                           dP
         88                         88                           88
.d8888b. 88d888b. .d8888b. .d8888b. 88  .dP  .d8888b. dP    dP d8888P
88'  `"" 88'  `88 88ooood8 88'  `"" 88888"   88'  `88 88    88   88
88.  ... 88    88 88.  ... 88.  ... 88  `8b. 88.  .88 88.  .88   88
`88888P' dP    dP `88888P' `88888P' dP   `YP `88888P' `88888P'   dP

 */
 router.post('/api/stripe/create-checkout-session', cors(), async (req, res) => {
  const prices = await stripe.prices.list({
    lookup_keys: [req.body.lookup_key],
    expand: ['data.product'],
  });
  const session = await stripe.checkout.sessions.create({
    billing_address_collection: 'auto',
    line_items: [
      {
        price: prices.data[0].id,
        // For metered billing, do not pass quantity
        quantity: 1,

      },
    ],
    mode: 'subscription',
    success_url: `${YOUR_DOMAIN_BILLING}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${YOUR_DOMAIN_BILLING}/cancel.html`,
    subscription_data: {
      trial_period_days: 7,
    },
    automatic_tax: { enabled: true },
  });

  res.redirect(303, session.url);
});

/*
                             dP            dP
                             88            88
88d888b. .d8888b. 88d888b. d8888P .d8888b. 88
88'  `88 88'  `88 88'  `88   88   88'  `88 88
88.  .88 88.  .88 88         88   88.  .88 88
88Y888P' `88888P' dP         dP   `88888P8 dP
88
dP
*/

router.post('/api/stripe/create-portal-session', cors(), async (req, res) => {
  console.log('in create-portal-session: ',req.body.customer_id);
  const session = await stripe.billingPortal.sessions.create({
    customer: req.body.customer_id,
    return_url: `${YOUR_DOMAIN_BILLING}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
  });

  res.redirect(session.url);

  //res.redirect(303, session.url);
});

export default router;
//export default
/*
                    dP       dP                         dP
                    88       88                         88
dP  dP  dP .d8888b. 88d888b. 88d888b. .d8888b. .d8888b. 88  .dP
88  88  88 88ooood8 88'  `88 88'  `88 88'  `88 88'  `88 88888"
88.88b.88' 88.  ... 88.  .88 88    88 88.  .88 88.  .88 88  `8b.
8888P Y8P  `88888P' 88Y8888' dP    dP `88888P' `88888P' dP   `YP
 */

/*


// This is your Stripe CLI webhook secret for testing your endpoint locally.
const webhookSecret = "whsec_978ef835a3626ee17d217f4dcbca2fd252dc8fe58d4d4cda8a9738db59e7f865";

//app.post('/stripe/webhook', express.raw({type: 'application/json'}), (request, response) => {
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), function (req, res) {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    // On error, log and return the error message
    console.log(`❌ Error message: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Successfully constructed event
  console.log('✅ Success:', event.id);




    // Handle the event
    switch (event.type) {
      case 'customer.subscription.updated':
        const subscriptionUpdated = event.data.object;
        // Then define and call a function to handle the event charge.succeeded
        console.log('customer.subscription.updated', JSON.stringify(subscriptionUpdated, null, 2));
        break;
      case 'customer.subscription.created':
        const customerSubscriptionCreated = event.data.object;
        // Then define and call a function to handle the event customer.subscription.created
        console.log('customer.subscription.created', JSON.stringify(customerSubscriptionCreated, null, 2))
        break;
      case 'customer.subscription.deleted':
        const customerSubscriptionDeleted = event.data.object;
        // Then define and call a function to handle the event customer.subscription.deleted
        console.log('customer.subscription.deleted', JSON.stringify(customerSubscriptionDeleted, null, 2));
        break;
      case 'customer.subscription.trial_will_end':
        const customerSubscriptionTrialWillEnd = event.data.object;
        // Then define and call a function to handle the event customer.subscription.trial_will_end
        console.log('customer.subscription.trial_will_end', JSON.stringify(customerSubscriptionTrialWillEnd, null, 2));
        break;
      case 'customer.subscription.updated':
        const customerSubscriptionUpdated = event.data.object;
        // Then define and call a function to handle the event customer.subscription.updated
        console.log('customer.subscription.updated', JSON.stringify(customerSubscriptionUpdated, null, 2));
        break;


      case 'invoice.payment_action_needed':
        const invoicePaymentActionNeeded = event.data.object;
        // Then define and call a function to handle the event customer.subscription.trial_will_end
        console.log('invoice.payment_action_needed', JSON.stringify(invoicePaymentActionNeeded, null, 2));
        break;
      case 'invoice.payment_failed':
        const invoicePaymentFailed = event.data.object;
        // Then define and call a function to handle the event customer.subscription.updated
        console.log('invoice.payment_failed', JSON.stringify(invoicePaymentFailed, null, 2));
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

  // Return a 200 response to acknowledge receipt of the event
  res.json({received: true});
});

 */


/*
event.data.object:

customer.subscription.updated {
  "id": "sub_1NXmtqAa2I46X5Fe2dMWCMBv",
  "object": "subscription",
  "application": null,
  "application_fee_percent": null,
  "automatic_tax": {
    "enabled": false
  },
  "billing_cycle_anchor": 1690297906,
  "billing_thresholds": null,
  "cancel_at": null,
  "cancel_at_period_end": false,
  "canceled_at": null,
  "cancellation_details": {
    "comment": null,
    "feedback": null,
    "reason": null
  },
  "collection_method": "charge_automatically",
  "created": 1690297906,
  "currency": "usd",
  "current_period_end": 1692976306,
  "current_period_start": 1690297906,
  "customer": "cus_OKRn5vOTxTiYXu",
  "days_until_due": null,
  "default_payment_method": null,
  "default_source": null,
  "default_tax_rates": [],
  "description": null,
  "discount": null,
  "ended_at": null,
  "items": {
    "object": "list",
    "data": [
      {
        "id": "si_OKRnewEI1Sw0jE",
        "object": "subscription_item",
        "billing_thresholds": null,
        "created": 1690297907,
        "metadata": {},
        "plan": {
          "id": "plan_OKRnapqS60W0KT",
          "object": "plan",
          "active": true,
          "aggregate_usage": null,
          "amount": 2000,
          "amount_decimal": "2000",
          "billing_scheme": "per_unit",
          "created": 1690297906,
          "currency": "usd",
          "interval": "month",
          "interval_count": 1,
          "livemode": false,
          "metadata": {},
          "nickname": null,
          "product": "prod_OKRneLfJ71SAZy",
          "tiers": null,
          "tiers_mode": null,
          "transform_usage": null,
          "trial_period_days": null,
          "usage_type": "licensed"
        },
        "price": {
          "id": "plan_OKRnapqS60W0KT",
          "object": "price",
          "active": true,
          "billing_scheme": "per_unit",
          "created": 1690297906,
          "currency": "usd",
          "custom_unit_amount": null,
          "livemode": false,
          "lookup_key": null,
          "metadata": {},
          "nickname": null,
          "product": "prod_OKRneLfJ71SAZy",
          "recurring": {
            "aggregate_usage": null,
            "interval": "month",
            "interval_count": 1,
            "trial_period_days": null,
            "usage_type": "licensed"
          },
          "tax_behavior": "unspecified",
          "tiers_mode": null,
          "transform_quantity": null,
          "type": "recurring",
          "unit_amount": 2000,
          "unit_amount_decimal": "2000"
        },
        "quantity": 1,
        "subscription": "sub_1NXmtqAa2I46X5Fe2dMWCMBv",
        "tax_rates": []
      }
    ],
    "has_more": false,
    "total_count": 1,
    "url": "/v1/subscription_items?subscription=sub_1NXmtqAa2I46X5Fe2dMWCMBv"
  },
  "latest_invoice": "in_1NXmtqAa2I46X5FeijaazR4T",
  "livemode": false,
  "metadata": {
    "foo": "bar"
  },
  "next_pending_invoice_item_invoice": null,
  "on_behalf_of": null,
  "pause_collection": null,
  "payment_settings": {
    "payment_method_options": null,
    "payment_method_types": null,
    "save_default_payment_method": "off"
  },
  "pending_invoice_item_interval": null,
  "pending_setup_intent": null,
  "pending_update": null,
  "plan": {
    "id": "plan_OKRnapqS60W0KT",
    "object": "plan",
    "active": true,
    "aggregate_usage": null,
    "amount": 2000,
    "amount_decimal": "2000",
    "billing_scheme": "per_unit",
    "created": 1690297906,
    "currency": "usd",
    "interval": "month",
    "interval_count": 1,
    "livemode": false,
    "metadata": {},
    "nickname": null,
    "product": "prod_OKRneLfJ71SAZy",
    "tiers": null,
    "tiers_mode": null,
    "transform_usage": null,
    "trial_period_days": null,
    "usage_type": "licensed"
  },
  "quantity": 1,
  "schedule": null,
  "start_date": 1690297906,
  "status": "active",
  "tax_percent": null,
  "test_clock": null,
  "transfer_data": null,
  "trial_end": null,
  "trial_settings": {
    "end_behavior": {
      "missing_payment_method": "create_invoice"
    }
  },
  "trial_start": null
}

 */