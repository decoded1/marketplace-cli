const extensionInfo = {
    domains: ["facebook.com"],
    name: "Facebook Marketplace Scraper",
    id: "fbmarketplace-scraper",
    backendUrl: "https://nifty.codes",
    loginWarning: `<b>Tip:</b> Login to Facebook for full data access`,
    website: {"url":"https://nifty.codes", "name":"nifty.codes"},
    version: "2.0.0"
}

const scraperTemplate = {
    id: "",
    name: "",
    popupGuide: "",
    guideQuestion: "",
    guide: [],
    fields: [],
    visibleField: "",
    /* visibleField is the field that will be shown to the user in modal, final page, and details page */
    pageDelay: 0,
    fetchDelay: 0,
    windowDelay: 0,
    objectDelay: 0,
    multiDelay: 0,
    newPage: {
        setIdentifier:() => {
            /* store the current page url, or any other idenifier of the page in the storage */
        },
        getIdentifier:() => {
            /* get the current page url, or any other idenifier of the page from the storage */
        },
        check:() => {
            /* check if the current page url, or any other idenifier of the page is different from the stored one in the storage */
        }
    },
    check: {
        page: () => {},
        fetch: (url, method, contentType, data) => {},
        window: (key, value) => {},
        object: (key, results) => {},
        multi: () => {}
    },
    scrape: {
        page: () => {},
        fetch: (data) => {},
        window: (value) => {},
        object: (results) => {},
        multi: () => {}
    },
    format: {
        page: (item) => {},
        fetch: (item) => {},
        window: (item) => {},
        object: (item) => {},
        multi: (item) => {}
    },
    highlighter: (item) => {
            /* 
                to prevent scrolling to the item, return false
                to scroll to the item, return the itemElem
            */
    },
    dehighlighter: (item) => {},
    paginationDelay: 0, //delay between pagination, if preloaded, it will wait then invoke autoPagination, if loaded, it will invoke autoPagination then wait.
    paginationType: "preloaded", //loaded (for fetched data), preloaded (for preloaded data)
    paginationWaitForTimeout: 15000, //timeout for paginationWaitFor
    autoPagination: async () => {
        //click next, or scroll down
    },
    paginationWaitFor: async () => {
        //check if the data is loaded
    }
}

const multiObject = {/* object used to store data from types like fetch, window, object to be used in multi */};

function searchField(obj, fieldName, parentDepth = 0, results = [], parents = []) {
    if (typeof obj !== "object" || obj === null) {
        return results; // Stop if obj is not an object
    }

    for (const key in obj) {
        if (key === fieldName) {
            // Find the ancestor at parentDepth (0=self, 1=parent, 2=grandparent, etc.)
            let ancestorIndex = parents.length - parentDepth;
            if (ancestorIndex >= 0) {
                results.push(parents[ancestorIndex] || obj);
            } else {
                results.push(obj); // Fallback: return self if not enough ancestors
            }
        } 
        if (typeof obj[key] === "object" && obj[key] !== null) {
            // Add current object to the parent chain
            searchField(obj[key], fieldName, parentDepth, results, [...parents, obj]);
        }
    }
    return results;
}

const scrapers = {
    listings: {
        id: "listings",
        name: "Extract Listings",
        popupGuide: "Scroll down to load more listings.",
        guideQuestion: "How to extract Facebook Marketplace listings?",
        guide: [
            "Go to Facebook Marketplace.",
            "Browse to a search results or category page.",
            "Open the extension popup.",
            "Click on Extract Listings.",
            "A modal will appear with the available data.",
            "Click on Add to Export List to save the data.",
            "Scroll down to load more listings.",
            "Once you have all the data you need, open the extension popup and click on Export."
        ],
        fields: [
            "Title", "Price", "Formatted Price", "Location City", "Location State", "Image URL", "Category ID", "Is Hidden", "Is Live", "Is Pending", "Is Sold", "Seller", "Seller ID", "Delivery Types", "Listing Subtitle", "Listing URL"
        ],
        visibleField: "Title",
        pageDelay: 0,
        fetchDelay: 0,
        windowDelay: 0,
        objectDelay: 0,
        multiDelay: 0,
        newPage: {
            setIdentifier: () => {
                window.listingsNewPage = location.href;
            },
            getIdentifier: () => {
                return window.listingsNewPage;
            },
            check: () => {
                return location.href != window.listingsNewPage;
            }
        },
        check: {
            page: () => {
                const scripts = Array.from(document.querySelectorAll('script'));
                const targetScript = scripts.find(s => s.textContent.includes("primary_listing_photo"));
                
                try{
                    const parsedData = JSON.parse(targetScript.textContent);
                    const listings = searchField(parsedData, "primary_listing_photo")
                    return listings.length > 0 && !listings[0].creation_time;
                }catch(error){
                    return false;
                }
            },
            fetch: (url, method, contentType, data) => {
                try {
                    if(!data.includes("primary_listing_photo")) return false;
                    
                    const jsonObjects = data.split('\n')
                    .filter(line => line.trim())
                    .map(line => {
                        try {
                            return JSON.parse(line);
                        } catch (e) {
                            return null;
                        }
                    })
                    .filter(obj => obj);

                    // Search each object for primary_listing_photo
                    const results = [];
                    for (const obj of jsonObjects) {
                        const found = searchField(obj, "primary_listing_photo");
                        if (found && Array.isArray(found)) {
                            results.push(...found);
                        }
                    }

                    return results.length > 0 && !results[0].creation_time;
                } catch (error) {
                    return false;
                }
            }
        },
        scrape: {
            page: () => {
                const scripts = Array.from(document.querySelectorAll('script'));
                const targetScript = scripts.find(s => s.textContent.includes("primary_listing_photo"));
                if (!targetScript) return [];
                
                try {
                    const parsedData = JSON.parse(targetScript.textContent);
                    return searchField(parsedData, "primary_listing_photo");
                } catch (error) {
                    return [];
                }
            },
            fetch: (data) => {
                try {
                    // Since fetch data can contain multiple JSON objects per line
                    const jsonObjects = data.split('\n')
                        .filter(line => line.trim())
                        .map(line => {
                            try {
                                return JSON.parse(line);
                            } catch (e) {
                                return null;
                            }
                        })
                        .filter(obj => obj);

                    // Search each object for primary_listing_photo
                    const results = [];
                    for (const obj of jsonObjects) {
                        const found = searchField(obj, "primary_listing_photo");
                        if (found && Array.isArray(found)) {
                            results.push(...found);
                        }
                    }
                    return results;
                } catch (error) {
                    return [];
                }
            }
        },
        format: {
            page: (item) => {
                const id = item.id || item.entity_id || item.listing?.id || null;
                return {
                    id: id || "Not Available",
                    "Title": item.marketplace_listing_title || item.custom_title || item.data?.title || "Not Available",
                    "Price": item.listing_price?.amount_with_offset_in_currency?.toString() || item.row_1?.current_price_amount?.amount_with_offset?.toString() || "Not Available",
                    "Formatted Price": item.formatted_price?.text || item.row_1?.current_price_amount?.formattedAmountWithoutDecimals || "Not Available",
                    "Location City": item.location?.reverse_geocode?.city || item.row_2?.text?.split(", ")?.[0] || "Not Available",
                    "Location State": item.location?.reverse_geocode?.state || item.row_2?.text?.split(", ")?.[1] || "Not Available",
                    "Image URL": item.primary_listing_photo?.image?.uri || item.photo?.image?.uri || "Not Available",
                    "Category ID": item.marketplace_listing_category_id || "Not Available",
                    "Is Hidden": typeof item.is_hidden === "boolean" ? (item.is_hidden ? "Yes" : "No") : "Not Available",
                    "Is Live": typeof item.is_live === "boolean" ? (item.is_live ? "Yes" : "No") : "Not Available", 
                    "Is Pending": typeof item.is_pending === "boolean" ? (item.is_pending ? "Yes" : "No") : "Not Available",
                    "Is Sold": typeof item.is_sold === "boolean" ? (item.is_sold ? "Yes" : "No") : "Not Available",
                    "Seller": item.marketplace_listing_seller?.name || "Not Available",
                    "Seller ID": item.marketplace_listing_seller?.id || "Not Available",
                    "Delivery Types": item.delivery_types?.join(", ") || "Not Available",
                    "Listing Subtitle": item.row_3?.text || item.custom_sub_titles_with_rendering_flags?.map(s => s.subtitle).join(", ") || "Not Available",
                    "Listing URL": id ? `https://www.facebook.com/marketplace/item/${id}` : "Not Available"
                };
            },
            fetch: (item) => {
                return scrapers.listings.format.page(item);
            }
        },
        highlighter: (item) => {
            const itemElem = document.querySelector(`a[href*="${item.id}"]`)?.parentElement;
            if (itemElem) {
                itemElem.style.border = "5px solid #00A364";
                return itemElem;
            }
            return false;
        },
        dehighlighter: (item) => {
            const itemElem = document.querySelector(`a[href*="${item.id}"]`)?.parentElement;
            if (itemElem) {
                itemElem.style.border = "none";
            }
        },
        paginationDelay: 3000,
        paginationType: "loaded",
        autoPagination: async () => {
            const lastItem = Array.from(document.querySelectorAll(`a[href*="/marketplace/item"]`)).at(-1);
            if(lastItem){
                lastItem.scrollIntoView();
            }else{
                window.scrollTo(0, document.body.scrollHeight);
            }
            
            return true;
        }
    },
    listingDetails: {
        id: "listingDetails",
        name: "Extract Listing Details",
        popupGuide: "Go to other listings to add more data.",
        guideQuestion: "How to extract Facebook Marketplace listing details?",
        guide: [
            "Go to Facebook Marketplace.",
            "Go to a listing page.",
            "Open the extension popup.",
            "Click on Extract Listing Details.",
            "A modal will appear with the available data.",
            "Click on Add to Export List to save the data.",
            "Go to other listings to add more data.",
            "Once you have all the data you need, open the extension popup and click on Export."
        ],
        fields: [
            "Title", "Description", "Price", "Formatted Price", "Location", "Location City", "Location State", "Creation Time", "Is Live", "Is Pending", "Is Sold", "Is Hidden", "Seller Name", "Seller ID", "Seller URL", "Seller Join Time", "Delivery Types", "Category ID", "Image 1", "Image 2", "Image 3", "Image 4", "Image 5", "Video 1", "Video 2", "Video 3", "Condition", "Is Buy Now Enabled", "Is Shipping Offered", "Has Free Shipping", "Is Checkout Enabled", "Is Draft", "Can Seller Edit", "Is Purchase Protected", "Is Cart Enabled", "Is Email Communication Enabled", "Is Multi Variant Listing", "Latitude", "Longitude", "Listing URL"
        ],
        visibleField: "Title",
        pageDelay: 0,
        fetchDelay: 0,
        windowDelay: 0,
        objectDelay: 0,
        multiDelay: 0,
        newPage: {
            setIdentifier: () => {
                window.listingDetailsNewPage = location.href;
            },
            getIdentifier: () => {
                return window.listingDetailsNewPage;
            },
            check: () => {
                return location.href != window.listingDetailsNewPage;
            }
        },
        check: {
            page: () => {
                const scripts = Array.from(document.querySelectorAll('script'));
                const targetScript = scripts.find(s => s.textContent.includes("redacted_description"));
                try {
                    const parsedData = JSON.parse(targetScript.textContent);
                    const listings = searchField(parsedData, "redacted_description");
                    return listings.length > 0 && listings[0].creation_time;
                } catch (error) {
                    return false;
                }
            },
            fetch: (url, method, contentType, data) => {
                try {
                    if (data.includes("redacted_description")) {
                        const jsonObjects = data.split('\n')
                            .filter(line => line.trim())
                            .map(line => {
                                try {
                                    return JSON.parse(line);
                                } catch (e) {
                                    return null;
                                }
                            })
                            .filter(obj => obj);

                        for (const obj of jsonObjects) {
                            const found = searchField(obj, "redacted_description");
                            if (found && Array.isArray(found) && found.length > 0 && found[0].creation_time) {
                                if(!multiObject.listing_details){
                                    multiObject.listing_details = {}
                                }
                                multiObject.listing_details[found[0].id] = found[0];
                                break;
                            }
                        }
                    }
                    
                    if (data.includes("listing_photos") || data.includes("pre_recorded_videos")) {
                        const jsonObjects = data.split('\n')
                            .filter(line => line.trim())
                            .map(line => {
                                try {
                                    return JSON.parse(line);
                                } catch (e) {
                                    return null;
                                }
                            })
                            .filter(obj => obj);

                        for (const obj of jsonObjects) {
                            const foundPhotos = searchField(obj, "listing_photos");
                            const foundVideos = searchField(obj, "pre_recorded_videos");
                            
                            if ((foundPhotos && Array.isArray(foundPhotos) && foundPhotos.length > 0) || 
                                (foundVideos && Array.isArray(foundVideos) && foundVideos.length > 0)) {
                                if(!multiObject.listing_photos){
                                    multiObject.listing_photos = {}
                                }
                                
                                // Get the listing ID from either photos or videos data
                                const listingId = foundPhotos?.[0]?.id || foundVideos?.[0]?.id;
                                if (listingId) {
                                    multiObject.listing_photos[listingId] = {
                                        id: listingId,
                                        listing_photos: foundPhotos?.[0]?.listing_photos || [],
                                        pre_recorded_videos: foundVideos?.[0]?.pre_recorded_videos || []
                                    };
                                    break;
                                }
                            }
                        }
                    }
                    return false;
                } catch (error) {
                    return false;
                }
            },
            multi: () => {
                let currentListing = location.href.match(/\/marketplace\/item\/(\d+)/)?.[1];
                return multiObject?.listing_details?.[currentListing] && multiObject?.listing_photos?.[currentListing];
            }
        },
        scrape: {
            page: () => {
                const scripts = Array.from(document.querySelectorAll('script'));
                const targetScript = scripts.find(s => s.textContent.includes("redacted_description"));
                const mediaScript = scripts.find(s => s.textContent.includes("listing_photos") || s.textContent.includes("pre_recorded_videos"));
                if (!targetScript) return [];
                
                try {
                    const results = {};
                    const parsedData = JSON.parse(targetScript.textContent);
                    const mediaData = mediaScript ? JSON.parse(mediaScript.textContent) : null;

                    const listing = searchField(parsedData, "redacted_description");
                    const photos = mediaData ? searchField(mediaData, "listing_photos") : [];
                    const videos = mediaData ? searchField(mediaData, "pre_recorded_videos") : [];

                    for(let i = 0; i < listing.length; i++){
                        results[listing[i].id] = {
                            ...listing[i]
                        }
                    }
                    
                    // Add photos
                    for(let i = 0; i < photos.length; i++){
                        if (results[photos[i].id]) {
                            results[photos[i].id].listing_photos = photos[i].listing_photos;
                        }
                    }
                    
                    // Add videos
                    for(let i = 0; i < videos.length; i++){
                        if (results[videos[i].id]) {
                            results[videos[i].id].pre_recorded_videos = videos[i].pre_recorded_videos;
                        }
                    }
                    
                    return Object.values(results);
                } catch (error) {
                    return [];
                }
            },
            multi: () => {
                if (!multiObject?.listing_details || !multiObject?.listing_photos) return [];
                let currentListing = location.href.match(/\/marketplace\/item\/(\d+)/)?.[1];
                let listing = multiObject?.listing_details?.[currentListing];
                let media = multiObject?.listing_photos?.[currentListing];
                return [{
                    ...listing,
                    listing_photos: media?.listing_photos || [],
                    pre_recorded_videos: media?.pre_recorded_videos || []
                }];
            }
        },
        format: {
            page: (item) => {
                // Combine photos and video thumbnails
                const photos = item.listing_photos?.map(photo => photo.listing_image?.uri || photo.image?.uri).filter(Boolean) || [];
                const videos = item.pre_recorded_videos?.map(video => video.playable_url).filter(Boolean) || [];
                
                return {
                    id: item.id || "Not Available",
                    "Title": item.marketplace_listing_title || "Not Available",
                    "Description": item.redacted_description?.text || "Not Available",
                    "Price": item.listing_price?.amount?.toString() || "Not Available",
                    "Formatted Price": item.listing_price?.formatted_amount_zeros_stripped?.toString() || "Not Available",
                    "Location": item.location_text?.text || "Not Available",
                    "Location City": item.location_text?.text?.split(", ")?.[0] || "Not Available",
                    "Location State": item.location_text?.text?.split(", ")?.[1] || "Not Available",
                    "Creation Time": item.creation_time || "Not Available",
                    "Is Live": typeof item.is_live === "boolean" ? (item.is_live ? "Yes" : "No") : "Not Available",
                    "Is Pending": typeof item.is_pending === "boolean" ? (item.is_pending ? "Yes" : "No") : "Not Available",
                    "Is Sold": typeof item.is_sold === "boolean" ? (item.is_sold ? "Yes" : "No") : "Not Available",
                    "Is Hidden": typeof item.is_hidden === "boolean" ? (item.is_hidden ? "Yes" : "No") : "Not Available",
                    "Seller Name": item.marketplace_listing_seller?.name || "Not Available",
                    "Seller ID": item.marketplace_listing_seller?.id || "Not Available",
                    "Seller URL": item.marketplace_listing_seller?.id ? `https://www.facebook.com/marketplace/profile/${item.marketplace_listing_seller?.id}` : "Not Available",
                    "Seller Join Time": item.marketplace_listing_seller?.join_time || "Not Available",
                    "Delivery Types": item.delivery_types?.join(", ") || "Not Available",
                    "Category ID": item.marketplace_listing_category_id || "Not Available",
                    "Image 1": photos[0] || "Not Available",
                    "Image 2": photos[1] || "Not Available",
                    "Image 3": photos[2] || "Not Available",
                    "Image 4": photos[3] || "Not Available",
                    "Image 5": photos[4] || "Not Available",
                    "Video 1": videos[0] || "Not Available",
                    "Video 2": videos[1] || "Not Available",
                    "Video 3": videos[2] || "Not Available",
                    "Condition": item.attribute_data?.find(attr => attr.attribute_name === "Condition")?.value || "Not Available",
                    "Is Buy Now Enabled": typeof item.is_buy_now_enabled === "boolean" ? (item.is_buy_now_enabled ? "Yes" : "No") : "Not Available",
                    "Is Shipping Offered": typeof item.is_shipping_offered === "boolean" ? (item.is_shipping_offered ? "Yes" : "No") : "Not Available",
                    "Has Free Shipping": typeof item.has_free_shipping_discounts === "boolean" ? (item.has_free_shipping_discounts ? "Yes" : "No") : "Not Available",
                    "Is Checkout Enabled": typeof item.is_checkout_enabled === "boolean" ? (item.is_checkout_enabled ? "Yes" : "No") : "Not Available",
                    "Is Draft": typeof item.is_draft === "boolean" ? (item.is_draft ? "Yes" : "No") : "Not Available",
                    "Can Seller Edit": typeof item.can_seller_edit === "boolean" ? (item.can_seller_edit ? "Yes" : "No") : "Not Available",
                    "Is Purchase Protected": typeof item.is_purchase_protected === "boolean" ? (item.is_purchase_protected ? "Yes" : "No") : "Not Available",
                    "Is Cart Enabled": typeof item.is_cart_enabled === "boolean" ? (item.is_cart_enabled ? "Yes" : "No") : "Not Available",
                    "Is Email Communication Enabled": typeof item.is_email_communication_enabled === "boolean" ? (item.is_email_communication_enabled ? "Yes" : "No") : "Not Available",
                    "Is Multi Variant Listing": typeof item.is_multi_variant_listing === "boolean" ? (item.is_multi_variant_listing ? "Yes" : "No") : "Not Available",
                    "Latitude": item.location?.latitude?.toString() || "Not Available",
                    "Longitude": item.location?.longitude?.toString() || "Not Available",
                    "Listing URL": item.id ? `https://www.facebook.com/marketplace/item/${item.id}` : "Not Available"
                };
            },
            multi: (item) => {
                return scrapers.listingDetails.format.page(item);
                
            }
        }
    },
    sellerDetails: {
        id: "sellerDetails",
        name: "Extract Seller Details",
        popupGuide: "Go to other seller profiles to add more data.",
        guideQuestion: "How to extract Facebook Marketplace seller details?",
        guide: [
            "Go to Facebook Marketplace.",
            "Go to a seller's profile page.",
            "Open the extension popup.",
            "Click on Extract Seller Details.",
            "A modal will appear with the available data.",
            "Click on Add to Export List to save the data.",
            "Go to other seller profiles to add more data.",
            "Once you have all the data you need, open the extension popup and click on Export."
        ],
        fields: [
            "Name", "Short Name", "Gender", "Location", "Join Time", "Profile Picture URL", "Cover Photo URL", "Marketplace Inventory Count", "Follower Count", "Rating Average", "Total Ratings", "Good Attributes", "Bad Attributes", "Response Time", "Communication Rating"
        ],
        visibleField: "Name",
        pageDelay: 0,
        fetchDelay: 0,
        windowDelay: 0,
        objectDelay: 0,
        multiDelay: 0,
        newPage: {
            setIdentifier: () => {
                window.sellerDetailsNewPage = location.href;
            },
            getIdentifier: () => {
                return window.sellerDetailsNewPage;
            },
            check: () => {
                return location.href != window.sellerDetailsNewPage;
            }
        },
        check: {
            page: () => {
                const scripts = Array.from(document.querySelectorAll('script'));
                const targetScript = scripts.find(s => s.textContent.includes("cover_photo"));
                
                try {
                    const parsedData = JSON.parse(targetScript.textContent);
                    const sellers = searchField(parsedData, "cover_photo");
                    return sellers.length > 0;
                } catch (error) {
                    return false;
                }
            },
            fetch: (url, method, contentType, data) => {
                try {
                    if (!data.includes("cover_photo")) return false;
                    const jsonObjects = data.split('\n')
                        .filter(line => line.trim())
                        .map(line => {
                            try {
                                return JSON.parse(line);
                            } catch (e) {
                                return null;
                            }
                        })
                        .filter(obj => obj);
                    
                    for (const obj of jsonObjects) {
                        const sellers = searchField(obj, "cover_photo");
                        if (sellers.length > 0) return true;
                    }
                    return false;
                } catch (error) {
                    return false;
                }
            }
        },
        scrape: {
            page: () => {
                const scripts = Array.from(document.querySelectorAll('script'));
                const targetScript = scripts.find(s => s.textContent.includes("cover_photo"));
                if (!targetScript) return [];
                
                try {
                    const parsedData = JSON.parse(targetScript.textContent);
                    return searchField(parsedData, "cover_photo");
                } catch (error) {
                    return [];
                }
            },
            fetch: (data) => {
                try {
                    const jsonObjects = data.split('\n')
                        .filter(line => line.trim())
                        .map(line => {
                            try {
                                return JSON.parse(line);
                            } catch (e) {
                                return null;
                            }
                        })
                        .filter(obj => obj);

                    const results = [];
                    for (const obj of jsonObjects) {
                        const found = searchField(obj, "cover_photo");
                        if (found && Array.isArray(found)) {
                            results.push(...found);
                        }
                    }
                    return results;
                } catch (error) {
                    return [];
                }
            }
        },
        format: {
            page: (item) => {
                const sellerStats = item.marketplace_ratings_stats_by_role?.seller_stats || {};
                const goodAttributes = sellerStats.good_attributes_counts?.map(attr => `${attr.title.text}: ${attr.count}`).join(", ") || "Not Available";
                const badAttributes = sellerStats.bad_attributes_counts?.map(attr => `${attr.title.text}: ${attr.count}`).join(", ") || "Not Available";
                
                return {
                    id: item.id || "Not Available",
                    "Name": item.name || "Not Available",
                    "Short Name": item.short_name || "Not Available",
                    "Gender": item.gender || "Not Available",
                    "Location": item.items?.nodes?.find(n => n.title?.text?.includes("Lives in"))?.title?.text || "Not Available",
                    "Join Time": item.items?.nodes?.find(n => n.title?.text?.includes("Joined Facebook"))?.title?.text || "Not Available",
                    "Profile Picture URL": item.profile_picture_160?.uri || "Not Available",
                    "Cover Photo URL": item.cover_photo?.photo?.image?.uri || "Not Available",
                    "Marketplace Inventory Count": item.marketplace_inventory_count || "Not Available",
                    "Follower Count": item.marketplace_user_profile?.if_viewer_can_follow?.marketplace_followers?.count || "Not Available",
                    "Rating Average": sellerStats.five_star_ratings_average?.toString() || "Not Available",
                    "Total Ratings": sellerStats.five_star_total_rating_count_by_role?.toString() || "Not Available",
                    "Good Attributes": goodAttributes,
                    "Bad Attributes": badAttributes,
                    "Response Time": item.items?.nodes?.find(n => n.title?.text?.includes("Typically replies"))?.title?.text || "Not Available",
                    "Communication Rating": sellerStats.good_attributes_counts?.find(attr => attr.title.text === "Communication")?.count || "Not Available"
                };
            },
            fetch: (item) => {
                return scrapers.sellerDetails.format.page(item);
            }
        }
    },
    sellerReviews: {
        id: "sellerReviews",
        name: "Extract Seller Reviews",
        popupGuide: "Scroll next to load more reviews.",
        guideQuestion: "How to extract Facebook Marketplace seller reviews?",
        guide: [
            "Go to Facebook Marketplace.",
            "Go to a seller's profile page.",
            "Open the extension popup.",
            "Click on Extract Seller Reviews.",
            "A modal will appear with the available data.",
            "Click on Add to Export List to save the data.",
            "Scroll next to load more reviews.",
            "Once you have all the data you need, open the extension popup and click on Export."
        ],
        fields: [
            "Review Text", "Rater Name", "Rater Profile Picture", "Ratee Name", "Ratee Profile Picture", "Does Viewer Like", "Reaction Count", "Response Creation Time", "Response Text", "Is Reported", "Rating Value", "Creation Time", "Rating Attributes"
        ],
        visibleField: "Rater Name",
        pageDelay: 0,
        fetchDelay: 0,
        windowDelay: 0,
        objectDelay: 0,
        multiDelay: 0,
        newPage: {
            setIdentifier: () => {
                window.sellerReviewsNewPage = location.href;
            },
            getIdentifier: () => {
                return window.sellerReviewsNewPage;
            },
            check: () => {
                return location.href != window.sellerReviewsNewPage;
            }
        },
        check: {
            page: () => {
                const scripts = Array.from(document.querySelectorAll('script'));
                const targetScript = scripts.find(s => s.textContent.includes("rating_value"));
                
                try {
                    const parsedData = JSON.parse(targetScript.textContent);
                    const reviews = searchField(parsedData, "rating_value");
                    return reviews.length > 0;
                } catch (error) {
                    return false;
                }
            },
            fetch: (url, method, contentType, data) => {
                try {
                    if (!data.includes("rating_value")) return false;
                    const jsonObjects = data.split('\n')
                        .filter(line => line.trim())
                        .map(line => {
                            try {
                                return JSON.parse(line);
                            } catch (e) {
                                return null;
                            }
                        })
                        .filter(obj => obj);
                    
                    for (const obj of jsonObjects) {
                        const reviews = searchField(obj, "rating_value");
                        if (reviews.length > 0) return true;
                    }
                    return false;
                } catch (error) {
                    return false;
                }
            }
        },
        scrape: {
            page: () => {
                const scripts = Array.from(document.querySelectorAll('script'));
                const targetScript = scripts.find(s => s.textContent.includes("rating_value"));
                if (!targetScript) return [];
                
                try {
                    const parsedData = JSON.parse(targetScript.textContent);
                    return searchField(parsedData, "rating_value");
                } catch (error) {
                    return [];
                }
            },
            fetch: (data) => {
                try {
                    const jsonObjects = data.split('\n')
                        .filter(line => line.trim())
                        .map(line => {
                            try {
                                return JSON.parse(line);
                            } catch (e) {
                                return null;
                            }
                        })
                        .filter(obj => obj);

                    const results = [];
                    for (const obj of jsonObjects) {
                        const found = searchField(obj, "rating_value");
                        if (found && Array.isArray(found)) {
                            results.push(...found);
                        }
                    }
                    return results;
                } catch (error) {
                    return [];
                }
            }
        },
        format: {
            page: (item) => {
                const reviewInfo = item.review_info || {};
                return {
                    id: item.id || "Not Available",
                    "Review Text": reviewInfo.review_text || "Not Available",
                    "Rater Name": reviewInfo.rater_name || "Not Available",
                    "Rater Profile Picture": reviewInfo.rater_pic_uri || "Not Available",
                    "Ratee Name": reviewInfo.ratee_name || "Not Available",
                    "Ratee Profile Picture": reviewInfo.ratee_pic_uri || "Not Available",
                    "Does Viewer Like": typeof reviewInfo.rating_feedback?.does_viewer_like === "boolean" ? (reviewInfo.rating_feedback?.does_viewer_like ? "Yes" : "No") : "Not Available",
                    "Reaction Count": reviewInfo.rating_feedback?.reaction_count?.toString() || "Not Available",
                    "Response Creation Time": reviewInfo.response_info?.response_creation_time || "Not Available",
                    "Response Text": reviewInfo.response_info?.response_text || "Not Available",
                    "Is Reported": typeof reviewInfo.viewer_has_reported_rating === "boolean" ? (reviewInfo.viewer_has_reported_rating ? "Yes" : "No") : "Not Available",
                    "Rating Value": item.rating_value?.toString() || "Not Available",
                    "Creation Time": item.creation_time || "Not Available",
                    "Rating Attributes": item.rating_attributes?.join(", ") || "Not Available"
                };
            },
            fetch: (item) => {
                return scrapers.sellerReviews.format.page(item);
            }
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { scrapers };
} else {
    window.scrapers = scrapers;
}