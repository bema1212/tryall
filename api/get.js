export default async function handler(req, res) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Voeg target4 toe aan de query parameters
    const { target0, target1, target2, target3, target4 } = req.query;

    if (!target0 || !target1 || !target2 || !target3 || !target4) {
      return res.status(400).json({ error: "All parameters (target0 t/m target4) are required" });
    }

    // Splits de coördinaten van target4 (formaat verwacht: "lat,lon")
    const [lon, lat] = target4.split(',').map(coord => parseFloat(coord));

    const apiUrl0 = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?id=${target0}`;
    const apiUrl1 = `https://public.ep-online.nl/api/v5/PandEnergielabel/AdresseerbaarObject/${target1}`;
    const encodedTarget1 = encodeURIComponent(target1);
    const apiUrl5 = `https://service.pdok.nl/lv/bag/wfs/v2_0?service=wfs&version=2.0.0&request=getfeature&typeName=bag:verblijfsobject&outputformat=application/json&srsName=EPSG:4326&filter=%3Cfes:Filter%20xmlns:fes=%22http://www.opengis.net/fes/2.0%22%20xmlns:xsi=%22http://www.w3.org/2001/XMLSchema-instance%22%20xsi:schemaLocation=%22http://www.opengis.net/wfs/2.0%20http://schemas.opengis.net/wfs/2.0/wfs.xsd%22%3E%3Cfes:PropertyIsEqualTo%3E%3Cfes:PropertyName%3Eidentificatie%3C/fes:PropertyName%3E%3Cfes:Literal%3E${encodedTarget1}%3C/fes:Literal%3E%3C/fes:PropertyIsEqualTo%3E%3C/fes:Filter%3E`;
    const apiUrl8 = `https://beter2.vercel.app/api/handler?url=https://nationaalenergielabel.com/_next/data/QcCaTC3CYAJm6xKYXek6p/adrescheck.json?id=${target1}`;
    const apiUrl9 = `https://service.pdok.nl/cbs/postcode6/2024/wfs/v1_0?service=WFS&version=2.0.0&request=GetFeature&typeNames=postcode6&outputFormat=application/json&propertyName=gemiddeldeHuishoudensgrootte&srsName=EPSG:28992&&bbox=${target3}`;

    const fetchWithErrorHandling = async (url, options = {}) => {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error(`Error fetching ${url}:`, error.message);
        return { error: "error" };
      }
    };

    // Aangepaste functie specifiek voor de POST request naar Mijnaansluiting
    const fetchNetbeheerderData = async () => {
      try {
        const response = await fetch("https://services.mijnaansluiting.nl/geo/api/address/netbeheerderdiscipline", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            coordinates: {
              latitude: lat,
              longitude: lon
            }
          })
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching netbeheerder data:", error.message);
        return { error: "error" };
      }
    };

    // GECORRIGEERD: data2 ontvangt nu het resultaat van de aangeroepen fetchNetbeheerderData() functie
    const [data0, data1, data2, data5, data8, data9] = await Promise.all([
      fetchWithErrorHandling(apiUrl0, { headers: { 'Content-Type': 'application/json' } }),
      fetchWithErrorHandling(apiUrl1, {
        headers: {
          "Authorization": process.env.AUTH_TOKEN,
          'Content-Type': 'application/json',
        }
      }),
      fetchNetbeheerderData(), // <-- HIER GING HET MIS: Nu wordt de functie wél uitgevoerd!
      fetchWithErrorHandling(apiUrl5, { headers: { 'Content-Type': 'application/json' } }),
      fetchWithErrorHandling(apiUrl8, { headers: { 'Content-Type': 'application/json' } }),
      fetchWithErrorHandling(apiUrl9, { headers: { 'Content-Type': 'application/json' } })
    ]);

    // Extract coordinates from target2 (assumed to be in format "x,y")
    const [x, y] = target2.split(',').map(coord => parseFloat(coord));

    const apiUrl3 = `https://service.pdok.nl/kadaster/kadastralekaart/wms/v5_0?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&QUERY_LAYERS=Perceelvlak&layers=Perceelvlak&INFO_FORMAT=application/json&FEATURE_COUNT=1&I=2&J=2&CRS=EPSG:28992&STYLES=&WIDTH=5&HEIGHT=5&BBOX=${target3}`;
    const response3 = await fetchWithErrorHandling(apiUrl3, { headers: { 'Content-Type': 'application/json' } });

    const apiUrl4 = `https://service.pdok.nl/lv/bag/wfs/v2_0?service=WFS&version=2.0.0&request=GetFeature&propertyname=&count=200&outputFormat=json&srsName=EPSG:4326&typeName=bag:verblijfsobject&Filter=<Filter><DWithin><PropertyName>Geometry</PropertyName><gml:Point><gml:coordinates>${x},${y}</gml:coordinates></gml:Point><Distance units='m'>70</Distance></DWithin></Filter>`;
    const response4 = await fetchWithErrorHandling(apiUrl4, { headers: { 'Content-Type': 'application/json' } });

    // New API URL added in parallel
    const apiUrl6 = `https://service.pdok.nl/lv/bag/wfs/v2_0?service=WFS&version=2.0.0&request=GetFeature&count=200&outputFormat=application/json&srsName=EPSG:4326&typeName=bag:pand&Filter=%3CFilter%3E%20%3CDWithin%3E%3CPropertyName%3EGeometry%3C/PropertyName%3E%3Cgml:Point%3E%20%3Cgml:coordinates%3E${x},${y}%3C/gml:coordinates%3E%20%3C/gml:Point%3E%3CDistance%20units=%27m%27%3E70%3C/Distance%3E%3C/DWithin%3E%3C/Filter%3E`;
    const response6 = await fetchWithErrorHandling(apiUrl6, { headers: { 'Content-Type': 'application/json' } });

    if (!response3 || !response4 || !response6) {
      return res.status(500).json({ error: "Error fetching data from the bbox or WFS API" });
    }

    const data3 = response3;
    const data4 = response4;
    const data6 = response6;

    const data4Features = data4.features || [];

    const additionalData = await Promise.all(data4Features.map(async (feature) => {
      const identificatie = feature.properties?.identificatie;
      if (!identificatie) return null;

      const apiUrl = `https://beter2.vercel.app/api/handler?url=https://public.ep-online.nl/api/v5/PandEnergielabel/AdresseerbaarObject/${identificatie}`;

      try {
        const response = await fetch(apiUrl, {
          headers: {
            "Authorization": process.env.AUTH_TOKEN,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          return { identificatie, data };
        } else {
          return { identificatie, error: response.statusText };
        }
      } catch (error) {
        return { identificatie, error: error.message };
      }
    }));

    const additionalDataFiltered = additionalData.filter(item => item !== null);

    const additionalDataMap = new Map();
    additionalDataFiltered.forEach(item => {
      additionalDataMap.set(item.identificatie, item);
    });

    const mergedData = data4Features
      .map(feature => {
        const identificatie = feature.properties?.identificatie;
        const additionalInfo = additionalDataMap.get(identificatie);
        const pandData = data6.features.find(pand => pand.properties?.identificatie === feature.properties?.pandidentificatie);

        if (!additionalInfo || additionalInfo.error || !pandData) {
          return null;
        }

        return {
          ...feature,
          additionalData: additionalInfo.data,
          additionalData2: [
            {
              geometry: pandData.geometry,
            }
          ],
        };
      })
      .filter(item => item !== null);

    // Het gecombineerde eindobject met alle gevulde keys
    const combinedData = {
      LOOKUP: data0,
      EPON: data1,
      NETB: data2, // Bevat nu de JSON-array van Mijnaansluiting
      KADAS: data3,
      OBJECT: data5,
      NATLAB: data8,
      CBS: data9,
      MERGED: mergedData
    };

    return res.status(200).json(combinedData);

  } catch (globalError) {
    console.error("Global crash handler:", globalError.message);
    return res.status(500).json({ error: globalError.message });
  }
}
