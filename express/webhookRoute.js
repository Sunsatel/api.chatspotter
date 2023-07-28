import express from 'express'
import fetch from 'node-fetch'
import bodyParser from 'body-parser'
import Stripe from 'stripe'
const stripe = Stripe('sk_test_61vDJj4xyA40vE0TdTFg5lQe00840D9EzQ');
import { supabase } from './supabaseClient.js'
const router = express.Router();

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const webhookSecret = "whsec_978ef835a3626ee17d217f4dcbca2fd252dc8fe58d4d4cda8a9738db59e7f865";
// AcumbaMail "ChatSpotter Admin Trxn"
const acumbaHook = 'https://acumbamail.com/webhook/incoming/5KC4T6jLFtWcEsmASYd3tO4Qq9LOMsWGPpWCfN1lEQdpLGWOU5o7Gy/odNBtgLbL1Djc0nIplugKQ==/'



/*
   ad88                                            88
  d8"                                        ,d    ""
  88                                         88
MM88MMM 88       88 8b,dPPYba,   ,adPPYba, MM88MMM 88  ,adPPYba,  8b,dPPYba,  ,adPPYba,
  88    88       88 88P'   `"8a a8"     ""   88    88 a8"     "8a 88P'   `"8a I8[    ""
  88    88       88 88       88 8b           88    88 8b       d8 88       88  `"Y8ba,
  88    "8a,   ,a88 88       88 "8a,   ,aa   88,   88 "8a,   ,a8" 88       88 aa    ]8I
  88     `"YbbdP'Y8 88       88  `"Ybbd8"'   "Y888 88  `"YbbdP"'  88       88 `"YbbdP"'
 */

async function acumbaMail(array, hook) {
  try {
    fetch(hook, {
      method: 'POST',
      body: JSON.stringify(array),
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      }
    }).then(function (response) {

      if (response.ok) {
        console.log('acumbaMail Success: ',response.json())
        return response.json();
      }
      throw response;
    }).then(function (data) {
      console.log('acumbaMail returned data: ',data);
    }).catch(function (error) {
      console.warn('acumbaMail ERROR',error);
    });// fetch

  } catch (error) {
    console.warn('acumbaMail ERROR', error);
  }
} // function

const customerEvent = async (obj) => {
  /*
   * This will capture the Stripe customer feed whenever
   *   a customer interacts and changes anything to do with their subscription.
   *
   *   1. Dump info into supabase
   */
    const { data, error } = await supabase
      .from('stripe_subscription_trxns')
      .insert(obj)
      .select('id')

        if (error) {
          console.error("Stripe Trxn Webhook Error: ", error || error.error_message)
        } else {
            console.log('Supabase Updated with Stripe Trxn:',data)
        }
}


/*
                                    ,d
                                    88
8b,dPPYba,   ,adPPYba,  ,adPPYba, MM88MMM
88P'    "8a a8"     "8a I8[    ""   88
88       d8 8b       d8  `"Y8ba,    88
88b,   ,a8" "8a,   ,a8" aa    ]8I   88,
88`YbbdP"'   `"YbbdP"'  `"YbbdP"'   "Y888
88
88
 */

router.post('/webhook', express.raw({ type: 'application/json' }), function (req, res) {
  const sig = req.headers['stripe-signature'];

  let event;
  let dbInsert = {}
  let acumbaObj = {}
  let acumbaBody = ''

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


    /*
                             o88    o8            oooo
     oooooooo8 oooo  o  oooo oooo o888oo ooooooo   888ooooo
    888ooooooo  888 888 888   888  888 888     888 888   888
            888  888888888    888  888 888         888   888
    88oooooo88    88   88    o888o  888o 88ooo888 o888o o888o
     */

    const obj = event.data.object
    const now = new Date(Date.now() - 4 * 60 * 60 * 1000) // minus 4 hours for admin timezone
    // Handle the event
    switch (event.type) {
      case 'customer.created':
        console.log('HERE COMES customer.created', JSON.stringify(obj, null, 2))
       // create object for database INSERT
       const subDataArray = obj.subscriptions.data
       subDataArray.url = obj.subscriptions.url

       /*
        *  1. Insert event into database
        */
            dbInsert = {}
              dbInsert["active"] = true
              dbInsert["customer"] = obj.id
              dbInsert["subscription_data"] = subDataArray

            customerEvent(dbInsert)


       /*
        *  2. Send admin email
        *       Transactional email to admin via AcumbaMail
        *       Early monitoring system / Replace with Admin Dashboard
        */
            acumbaBody = `A New Customer<br />
            subscriptions: ${obj.subscriptions.data}<br />
            stripe customer: ${obj.id}<br />
            url: ${subDataArray.url}<br />
            TodayNow: ${now.toISOString()}`

            acumbaObj = {
                "admin": {
                  "body":acumbaBody,
                  "category":"new customer",
                  "to_email":"dmayo2+chat_admin@gmail.com",
                  "from_email":"agent_smith@chatspotter.ai",
                  "subject":"ChatSpotter Subscription Updated"
                }

            }

            acumbaMail(acumbaObj, acumbaHook)
        break;


      case 'customer.subscription.updated':
        console.log('HERE COMES customer.subscription.updated', JSON.stringify(obj, null, 2))

       /*
        *  1. Insert event into database
        */
            dbInsert = {}
              dbInsert["active"] = true
              dbInsert["trxn_id"] = obj.id
              dbInsert["cancel_at"] = obj.cancel_at
              dbInsert["cancel_at_period_end"] = obj.cancel_at_period_end
              dbInsert["canceled_at"] = obj.canceled_at
              dbInsert["customer"] = obj.customer
              //dbInsert["current_period_start"] = obj.current_period_start
              //dbInsert["current_period_end"] = obj.cancel_at_period_end
              dbInsert["plan_amount"] = obj.plan.amount
              dbInsert["plan_status"] = obj.status
              dbInsert["plan_nickname"] = obj.plan.nickname
              dbInsert["product"] = obj.plan.product

            customerEvent(dbInsert)


       /*
        *  2. Send admin email
        *       Transactional email to admin via AcumbaMail
        *       Early monitoring system / Replace with Admin Dashboard
        */
            acumbaBody = `An updated subscription<br />
            Stripe Customer: ${obj.customer}<br />
            Product: ${obj.plan.product}<br />
            Plan Nickname: ${obj.plan.nickname}<br />
            TodayNow: ${now.toISOString()}`

            acumbaObj = {
                "admin": {
                  "body":acumbaBody,
                  "category":"sub updated",
                  "to_email":"dmayo2+chat_admin@gmail.com",
                  "from_email":"agent_smith@chatspotter.ai",
                  "subject":"ChatSpotter Subscription Updated"
                }

            }

            acumbaMail(acumbaObj, acumbaHook)
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


/*
                                                           ,d
                                                            88
 ,adPPYba, 8b,     ,d8 8b,dPPYba,   ,adPPYba,  8b,dPPYba, MM88MMM
a8P_____88  `Y8, ,8P'  88P'    "8a a8"     "8a 88P'   "Y8   88
8PP"""""""    )888(    88       d8 8b       d8 88           88
"8b,   ,aa  ,d8" "8b,  88b,   ,a8" "8a,   ,a8" 88           88,
 `"Ybbd8"' 8P'     `Y8 88`YbbdP"'   `"YbbdP"'  88           "Y888
                       88
                       88
 */
export default router;

/*
customer.subscription.updated

✅ Success: evt_1NYBATAa2I46X5FeSvGYZsUw
customer.subscription.updated {
  "id": "sub_1NYBAPAa2I46X5FejkvgCZGN",
  "object": "subscription",
  "application": null,
  "application_fee_percent": null,
  "automatic_tax": {
    "enabled": false
  },
  "billing_cycle_anchor": 1690391189,
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
  "created": 1690391189,
  "currency": "usd",
  "current_period_end": 1693069589,
  "current_period_start": 1690391189,
  "customer": "cus_OKqsNOotyedsgY",
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
        "id": "si_OKqsh8umWvX4Da",
        "object": "subscription_item",
        "billing_thresholds": null,
        "created": 1690391189,
        "metadata": {},
        "plan": {
          "id": "plan_OKqs4f9BxlFGch",
          "object": "plan",
          "active": true,
          "aggregate_usage": null,
          "amount": 2000,
          "amount_decimal": "2000",
          "billing_scheme": "per_unit",
          "created": 1690391188,
          "currency": "usd",
          "interval": "month",
          "interval_count": 1,
          "livemode": false,
          "metadata": {},
          "nickname": null,
          "product": "prod_OKqsD0m7sa36NF",
          "tiers": null,
          "tiers_mode": null,
          "transform_usage": null,
          "trial_period_days": null,
          "usage_type": "licensed"
        },
        "price": {
          "id": "plan_OKqs4f9BxlFGch",
          "object": "price",
          "active": true,
          "billing_scheme": "per_unit",
          "created": 1690391188,
          "currency": "usd",
          "custom_unit_amount": null,
          "livemode": false,
          "lookup_key": null,
          "metadata": {},
          "nickname": null,
          "product": "prod_OKqsD0m7sa36NF",
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
        "subscription": "sub_1NYBAPAa2I46X5FejkvgCZGN",
        "tax_rates": []
      }
    ],
    "has_more": false,
    "total_count": 1,
    "url": "/v1/subscription_items?subscription=sub_1NYBAPAa2I46X5FejkvgCZGN"
  },
  "latest_invoice": "in_1NYBAPAa2I46X5Fe59fmqurD",
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
    "id": "plan_OKqs4f9BxlFGch",
    "object": "plan",
    "active": true,
    "aggregate_usage": null,
    "amount": 2000,
    "amount_decimal": "2000",
    "billing_scheme": "per_unit",
    "created": 1690391188,
    "currency": "usd",
    "interval": "month",
    "interval_count": 1,
    "livemode": false,
    "metadata": {},
    "nickname": null,
    "product": "prod_OKqsD0m7sa36NF",
    "tiers": null,
    "tiers_mode": null,
    "transform_usage": null,
    "trial_period_days": null,
    "usage_type": "licensed"
  },
  "quantity": 1,
  "schedule": null,
  "start_date": 1690391189,
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

customer.created {
  "id": "cus_OLHLMTAjNXqIKw",
  "object": "customer",
  "address": null,
  "balance": 0,
  "created": 1690489665,
  "currency": null,
  "default_currency": null,
  "default_source": "card_1NYamjAa2I46X5Fez81huerG",
  "delinquent": false,
  "description": "(created by Stripe CLI)",
  "discount": null,
  "email": null,
  "invoice_prefix": "168FA942",
  "invoice_settings": {
    "custom_fields": null,
    "default_payment_method": null,
    "footer": null,
    "rendering_options": null
  },
  "livemode": false,
  "metadata": {},
  "name": null,
  "next_invoice_sequence": 1,
  "phone": null,
  "preferred_locales": [],
  "shipping": null,
  "sources": {
    "object": "list",
    "data": [
      {
        "id": "card_1NYamjAa2I46X5Fez81huerG",
        "object": "card",
        "address_city": null,
        "address_country": null,
        "address_line1": null,
        "address_line1_check": null,
        "address_line2": null,
        "address_state": null,
        "address_zip": null,
        "address_zip_check": null,
        "brand": "Visa",
        "country": "US",
        "customer": "cus_OLHLMTAjNXqIKw",
        "cvc_check": null,
        "dynamic_last4": null,
        "exp_month": 7,
        "exp_year": 2024,
        "fingerprint": "v0dSFDrJd9ZwLZcK",
        "funding": "credit",
        "last4": "4242",
        "metadata": {},
        "name": null,
        "tokenization_method": null,
        "wallet": null
      }
    ],
    "has_more": false,
    "total_count": 1,
    "url": "/v1/customers/cus_OLHLMTAjNXqIKw/sources"
  },
  "subscriptions": {
    "object": "list",
    "data": [],
    "has_more": false,
    "total_count": 0,
    "url": "/v1/customers/cus_OLHLMTAjNXqIKw/subscriptions"
  },
  "tax_exempt": "none",
  "tax_ids": {
    "object": "list",
    "data": [],
    "has_more": false,
    "total_count": 0,
    "url": "/v1/customers/cus_OLHLMTAjNXqIKw/tax_ids"
  },
  "test_clock": null
}


customer.subscription.created {
  "id": "sub_1NYamkAa2I46X5Fe7NISHFMP",
  "object": "subscription",
  "application": null,
  "application_fee_percent": null,
  "automatic_tax": {
    "enabled": false
  },
  "billing_cycle_anchor": 1690489666,
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
  "created": 1690489666,
  "currency": "usd",
  "current_period_end": 1693168066,
  "current_period_start": 1690489666,
  "customer": "cus_OLHLMTAjNXqIKw",
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
        "id": "si_OLHLBaABvsCR0C",
        "object": "subscription_item",
        "billing_thresholds": null,
        "created": 1690489666,
        "metadata": {},
        "plan": {
          "id": "plan_OLHLyspwkTifUf",
          "object": "plan",
          "active": true,
          "aggregate_usage": null,
          "amount": 2000,
          "amount_decimal": "2000",
          "billing_scheme": "per_unit",
          "created": 1690489666,
          "currency": "usd",
          "interval": "month",
          "interval_count": 1,
          "livemode": false,
          "metadata": {},
          "nickname": null,
          "product": "prod_OLHL1Tg3KMz3gX",
          "tiers": null,
          "tiers_mode": null,
          "transform_usage": null,
          "trial_period_days": null,
          "usage_type": "licensed"
        },
        "price": {
          "id": "plan_OLHLyspwkTifUf",
          "object": "price",
          "active": true,
          "billing_scheme": "per_unit",
          "created": 1690489666,
          "currency": "usd",
          "custom_unit_amount": null,
          "livemode": false,
          "lookup_key": null,
          "metadata": {},
          "nickname": null,
          "product": "prod_OLHL1Tg3KMz3gX",
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
        "subscription": "sub_1NYamkAa2I46X5Fe7NISHFMP",
        "tax_rates": []
      }
    ],
    "has_more": false,
    "total_count": 1,
    "url": "/v1/subscription_items?subscription=sub_1NYamkAa2I46X5Fe7NISHFMP"
  },
  "latest_invoice": "in_1NYamkAa2I46X5FeCeoWe3t5",
  "livemode": false,
  "metadata": {},
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
    "id": "plan_OLHLyspwkTifUf",
    "object": "plan",
    "active": true,
    "aggregate_usage": null,
    "amount": 2000,
    "amount_decimal": "2000",
    "billing_scheme": "per_unit",
    "created": 1690489666,
    "currency": "usd",
    "interval": "month",
    "interval_count": 1,
    "livemode": false,
    "metadata": {},
    "nickname": null,
    "product": "prod_OLHL1Tg3KMz3gX",
    "tiers": null,
    "tiers_mode": null,
    "transform_usage": null,
    "trial_period_days": null,
    "usage_type": "licensed"
  },
  "quantity": 1,
  "schedule": null,
  "start_date": 1690489666,
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