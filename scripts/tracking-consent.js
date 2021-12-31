// Enable Dark Mode
// TODO: Implement Elsewhere
document.body.classList.toggle('c_darkmode');

// TODO: Decide If Script Belongs Here (Probably Does)
function clear_analytic_cookies() {
	// Modified From: https://stackoverflow.com/a/57803258/6828099
	var cookieNames = document.cookie.split(/=[^;]*(?:;\s*|$)/);
	for (var i = 0; i < cookieNames.length; i++) {
		if (cookieNames[i].includes("_ga")) {
			// Erase Analytic Cookies
// 			document.cookie = cookieNames[i] + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
			document.cookie = cookieNames[i] + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; domain=.alexisevelyn.me'; // Fix For Live Site
		}
	}
}

// obtain plugin
var cc = initCookieConsent();

// run plugin with your configuration
cc.run({
    current_lang: 'en',
    autoclear_cookies: true,                   // default: false
    theme_css: 'https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@latest/dist/cookieconsent.css',  // 🚨 replace with a valid path
    page_scripts: true,                        // default: false

    // delay: 0,                               // default: 0
    // auto_language: null                     // default: null; could also be 'browser' or 'document'
    // autorun: true,                          // default: true
    // force_consent: false,                   // default: false
    // hide_from_bots: false,                  // default: false
    // remove_cookie_tables: false             // default: false
    // cookie_name: 'cc_cookie',               // default: 'cc_cookie'
    // cookie_expiration: 182,                 // default: 182 (days)
    // cookie_necessary_only_expiration: 182   // default: disabled
    // cookie_domain: location.hostname,       // default: current domain
    // cookie_path: '/',                       // default: root
    // cookie_same_site: 'Lax',                // default: 'Lax'
    // use_rfc_cookie: false,                  // default: false
    // revision: 0,                            // default: 0

    onFirstAction: function(user_preferences, cookie){
        // callback triggered only once - See: https://github.com/orestbida/cookieconsent#available-callbacks
    },

    onAccept: function (cookie) {
        // If Analytics Is Allowed To Load, Then Load Google Tag Manager
		if (cc.allowedCategory('analytics')) {
            cc.loadScript('/scripts/google-tag-manager.js', function () {});
        } else if (!cc.allowedCategory('analytics')) {
			// Sometimes GTM adds cookies back after being cleared, so make sure they are gone
			clear_analytic_cookies();
		}
    },

    onChange: function (cookie, changed_preferences) {
        // The autoclear_cookies setting takes care of this
    },

    languages: {
        'en': {
            consent_modal: {
                title: 'We use cookies!',
                description: 'Hi, this website uses essential cookies to ensure its proper operation and tracking cookies to understand how you interact with it. The latter will be set only after consent. <button type="button" data-cc="c-settings" class="cc-link">Let me choose</button>',
                primary_btn: {
                    text: 'Accept all',
                    role: 'accept_all'              // 'accept_selected' or 'accept_all'
                },
                secondary_btn: {
                    text: 'Reject all',
                    role: 'accept_necessary'        // 'settings' or 'accept_necessary'
                }
            },
            settings_modal: {
                title: 'Cookie preferences',
                save_settings_btn: 'Save settings',
                accept_all_btn: 'Accept all',
                reject_all_btn: 'Reject all',
                close_btn_label: 'Close',
                cookie_table_headers: [
                    {col1: 'Name'},
                    {col2: 'Domain'},
                    {col3: 'Expiration'},
                    {col4: 'Description'}
                ],
                blocks: [
                    {
                        title: 'Cookie usage 📢',
                        description: 'I use cookies to ensure the basic functionalities of the website and to enhance your online experience. You can choose for each category to opt-in/out whenever you want. For more details relative to cookies and other sensitive data, please read the full <a href="/privacy" class="cc-link">privacy policy</a>.'
                    }, {
                        title: 'Strictly necessary cookies',
                        description: 'These cookies are essential for the proper functioning of my website. Without these cookies, the website would not work properly',
                        toggle: {
                            value: 'necessary',
                            enabled: true,
                            readonly: true          // cookie categories with readonly=true are all treated as "necessary cookies"
                        }
                    }, {
                        title: 'Performance and Analytics cookies',
                        description: 'These cookies allow the website to remember the choices you have made in the past',
                        toggle: {
                            value: 'analytics',     // your cookie category
                            enabled: false,
                            readonly: false
                        },
                        cookie_table: [             // list of all expected cookies
                            {
                                col1: '^_ga',       // match all cookies starting with "_ga"
                                col2: 'google.com',
                                col3: '2 years',
                                col4: 'Used for basic information such as learning what pages are visited, your country, and the page you came from.',
                                is_regex: true
                            }
                        ]
                    }, {
                        title: 'More information',
                        description: 'For any queries in relation to our policy on cookies and your choices, please <a class="cc-link" href="https://twitter.com/AlexisEvelyn42">contact me</a>.',
                    }
                ]
            }
        }
    }
});
