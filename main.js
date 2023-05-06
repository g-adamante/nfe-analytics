let dataList = [];


document.getElementById('fileInput').addEventListener('change', (event) => {
    const files = event.target.files;
    dataList = [];

    Promise.all(Array.from(files).map(processFile))
        .then(() => {
            console.log("Data list:", dataList);
            if (dataList.length > 0) {
                plotData(dataList);

                const totalSales = calculateTotalSales(dataList);
                const totalSalesByProduct = calculateTotalSalesByProduct(dataList);
                const totalSalesByClient = calculateTotalSalesByClient(dataList);

                displayTotalSales(totalSales);
                displayTotalSalesByProduct(totalSalesByProduct);
                displayTotalSalesByClient(totalSalesByClient);

                populateFilters();

            }
        })
        .catch((err) => console.error(err));

        function processFile(file) {
            return new Promise((resolve, reject) => {
                if (file.name.endsWith('.xml')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const data = e.target.result;
                            xmlDoc = $.parseXML(data);
        
                            console.log("Parsed XML", file.name, xmlDoc);
                            $xml = $(xmlDoc);
        
                            function checkCnpj() {
                                const cnpj = $xml.find("dest").find("cnpj").text();
                                return cnpj.length > 0 ? 'cnpj' : 'cpf';
                            }
                            console.log($xml.find('prod').text())
        
                            $xml.find("prod").each((index, product) => {
                                const $product = $(product);
        
                                const row = {
                                    xprod: $product.find("xProd").text(),
                                    ncm: $product.find("NCM").text(),
                                    ucom: $product.find("uCom").text(),
                                    qcom: parseFloat($product.find("qCom").text()),
                                    vuncom: parseFloat($product.find("vUnCom").text()),
                                    vprod: parseFloat($product.find("vProd").text()),
                                    destCnpjCpf: $xml.find("dest").find(checkCnpj()).text(),
                                    xnome: $xml.find("dest").find("xNome").text(),
                                    dhemi: $xml.find("dhEmi").text()
                                };
        
                                console.log("Processed row", row);
                                dataList.push(row);
                            });
                            resolve();
                        } catch (e) {
                            console.error({file: file.name}, e);
                            reject(e);
                        }
                    };
                    reader.onerror = (err) => {
                        console.error('Error reading file', err);
                        reject(err);
                    };
                    reader.readAsText(file);
                } else {
                    resolve();
                }
            });
        }
        
});


function calculateTotalSales(dataList) {
    return dataList.reduce((total, item) => total + item.vprod, 0);
}

function calculateTotalSalesByProduct(dataList) {
    const salesByProduct = {};
    dataList.forEach((item) => {
        salesByProduct[item.xprod] = (salesByProduct[item.xprod] || 0) + item.vprod;
    });
    return salesByProduct;
}

function calculateTotalSalesByClient(dataList) {
    const salesByClient = {};
    dataList.forEach((item) => {
        salesByClient[item.xnome] = (salesByClient[item.xnome] || 0) + item.vprod;
    });
    return salesByClient;
}
function displayTotalSales(totalSales) {
    const totalSalesElement = document.getElementById('totalSales');
    const formattedTotalSales = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSales);
    totalSalesElement.textContent = `Vendas Totais: ${formattedTotalSales}`;
}

function displayTotalSalesByProduct(totalSalesByProduct) {
    const salesByProductElement = document.getElementById('salesByProduct');
    salesByProductElement.innerHTML = '';

    for (const product in totalSalesByProduct) {
        const formattedSales = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSalesByProduct[product]);

        const tr = document.createElement('tr');

        const tdProduct = document.createElement('td');
        tdProduct.classList.add('px-6', 'py-4', 'whitespace-nowrap');
        tdProduct.textContent = product;
        tr.appendChild(tdProduct);

        const tdSales = document.createElement('td');
        tdSales.classList.add('px-6', 'py-4', 'whitespace-nowrap');
        tdSales.textContent = formattedSales;
        tr.appendChild(tdSales);

        salesByProductElement.appendChild(tr);
    }
}

function displayTotalSalesByClient(totalSalesByClient) {
    const salesByClientElement = document.getElementById('salesByClient');
    salesByClientElement.innerHTML = '';

    for (const client in totalSalesByClient) {
        const formattedSales = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSalesByClient[client]);

        const tr = document.createElement('tr');

        const tdClient = document.createElement('td');
        tdClient.classList.add('px-6', 'py-4', 'whitespace-nowrap');
        tdClient.textContent = client;
        tr.appendChild(tdClient);

        const tdSales = document.createElement('td');
        tdSales.classList.add('px-6', 'py-4', 'whitespace-nowrap');
        tdSales.textContent = formattedSales;
        tr.appendChild(tdSales);

        salesByClientElement.appendChild(tr);
    }
}


function plotData(dataList) {
    const monthlySales = dataList.reduce((acc, item) => {
        const month = new Date(item.dhemi).toISOString().slice(0, 7); // Get the month (YYYY-MM format)
        acc[month] = (acc[month] || 0) + item.vprod;
        return acc;
    }, {});

    const trace = {
        x: Object.keys(monthlySales),
        y: Object.values(monthlySales),
        type: 'bar'
    };

    const data = [trace];

    const layout = {
        title: 'Faturamento vs Mês',
        xaxis: {
            title: 'Mês'
        },
        yaxis: {
            title: 'Valor do Produto',
            tickformat: ',.2f', // Use ',.2f' to format the number as Brazilian currency
            tickprefix: 'R$ ' // Add the currency symbol as a prefix
        }
    };
    
    
    

    Plotly.newPlot('chart', data, layout);
}

function removeNamespace(xmlString) {
    return xmlString.replace(/xmlns[^=]*="[^"]*"/g, '');
}

function populateFilters() {
    const uniqueProducts = new Set();
    const uniqueCompanies = new Set();

    dataList.forEach(item => {
        uniqueProducts.add(item.xprod);
        uniqueCompanies.add(item.xnome);
    });

    const productFilterElement = document.getElementById('productFilter');
    const companyFilterElement = document.getElementById('companyFilter');

    uniqueProducts.forEach(product => {
        const option = document.createElement('option');
        option.value = product;
        option.textContent = product;
        productFilterElement.appendChild(option);
    });

    uniqueCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        companyFilterElement.appendChild(option);
    });
}

document.getElementById('applyDateFilter').addEventListener('click', updateDataAndChart);

function updateDataAndChart() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const selectedProduct = document.getElementById('productFilter').value;
    const selectedCompany = document.getElementById('companyFilter').value;

    const filteredDataList = dataList.filter((item) => {
        const dhemiDate = new Date(item.dhemi);
        const isProductMatch = selectedProduct === "all" || item.xprod === selectedProduct;
        const isCompanyMatch = selectedCompany === "all" || item.xnome === selectedCompany;
        return (!startDate || new Date(startDate) <= dhemiDate) && (!endDate || dhemiDate <= new Date(endDate)) && isProductMatch && isCompanyMatch;
    });

    const totalSales = calculateTotalSales(filteredDataList);
    const totalSalesByProduct = calculateTotalSalesByProduct(filteredDataList);
    const totalSalesByClient = calculateTotalSalesByClient(filteredDataList);

    displayTotalSales(totalSales);
    displayTotalSalesByProduct(totalSalesByProduct);
    displayTotalSalesByClient(totalSalesByClient);

    plotData(filteredDataList); // Update the chart with the filtered data
}
