
// APAC Impressions

var options3 = {
  series: [{
    name: '% of impression occurance',
    data: [19, 12, 11, 9, 9]
  }],
  colors: ['#382AFA'],
  chart: {
    type: 'bar',
    height: 350
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: true
    }
  },
  dataLabels: {
    enabled: false
  },
  grid: {
    show: false,
  },
  xaxis: {
    categories: ['Flight Delays and Cancellations', 'Staff Attitude and Behavior', 'Seating and Comfort Concerns', 'Check in and Boarding Issues', 'Baggage Issues'],
    axisBorder: {
      show: false,
    },
    labels: {
      style: {
        colors: ['#0B037D'],
        fontSize: '14px',
        fontFamily: 'Onest, sans-serif',
      },
      formatter: function (value) {
        return value + '%';
      },
    },
  },
  yaxis: {
    labels: {
      maxWidth: 300,
      style: {
        colors: ['#0B037D'],
        fontSize: '16px',
        fontWeight: '500',
        fontFamily: 'Onest, sans-serif',
      },
    }
  }
};

var chart3 = new ApexCharts(document.querySelector("#chart3"), options3);
chart3.render();



// Europe Impressions

var options4 = {
  series: [{
    name: '% of impression occurance',
    data: [17, 15, 11, 11, 9]
  }],
  colors: ['#382AFA'],
  chart: {
    type: 'bar',
    height: 350
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: true
    }
  },
  dataLabels: {
    enabled: false
  },
  grid: {
    show: false,
  },
  xaxis: {
    categories: ['Hidden Fees and Extra Charges', 'Flight Delays and Cancellations', 'Rude Staff Behavior', 'Baggage Issues', 'Postive staff interaction'],
    axisBorder: {
      show: false,
    },
    labels: {
      style: {
        colors: ['#0B037D'],
        fontSize: '14px',
        fontFamily: 'Onest, sans-serif',
      },
      formatter: function (value) {
        return value + '%';
      },
    },
  },
  yaxis: {
    labels: {
      maxWidth: 300,
      style: {
        colors: ['#0B037D'],
        fontSize: '16px',
        fontWeight: '500',
        fontFamily: 'Onest, sans-serif',
      },
    }
  }
};

var chart4 = new ApexCharts(document.querySelector("#chart4"), options4);
chart4.render();


// North America Impressions

var options5 = {
  series: [{
    name: '% of impression occurance',
    data: [26, 19, 15, 8, 6]
  }],
  colors: ['#382AFA'],
  chart: {
    type: 'bar',
    height: 350
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: true
    }
  },
  dataLabels: {
    enabled: false
  },
  grid: {
    show: false,
  },
  xaxis: {
    categories: ['Flight Delays and Cancellations', 'In-Flight Experience', 'Customer Service Issues', 'Baggage Issues', 'Seat Assignment and Upgrades'],
    axisBorder: {
      show: false,
    },
    labels: {
      style: {
        colors: ['#0B037D'],
        fontSize: '14px',
        fontFamily: 'Onest, sans-serif',
      },
      formatter: function (value) {
        return value + '%';
      },
    },
  },
  yaxis: {
    labels: {
      maxWidth: 300,
      style: {
        colors: ['#0B037D'],
        fontSize: '16px',
        fontWeight: '500',
        fontFamily: 'Onest, sans-serif',
      },
    }
  }
};

var chart5 = new ApexCharts(document.querySelector("#chart5"), options5);
chart5.render();



// Middle East and Africa Impressions

var options6 = {
  series: [{
    name: '% of impression occurance',
    data: [19, 12, 10, 9, 8]
  }],
  colors: ['#382AFA'],
  chart: {
    type: 'bar',
    height: 350
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: true
    }
  },
  dataLabels: {
    enabled: false
  },
  grid: {
    show: false,
  },
  xaxis: {
    categories: ['Staff Attitude and Professionalism', 'Check in and Boarding Issues', 'Business Class Experience', 'Flight Delays and Cancellations', 'Refund and compensation'],
    axisBorder: {
      show: false,
    },
    labels: {
      style: {
        colors: ['#0B037D'],
        fontSize: '14px',
        fontFamily: 'Onest, sans-serif',
      },
      formatter: function (value) {
        return value + '%';
      },
    },
  },
  yaxis: {
    labels: {
      maxWidth: 300,
      style: {
        colors: ['#0B037D'],
        fontSize: '16px',
        fontWeight: '500',
        fontFamily: 'Onest, sans-serif',
      },
    }
  }
};

var chart6 = new ApexCharts(document.querySelector("#chart6"), options6);
chart6.render();



// Latin America Impressions

var options7 = {
  series: [{
    name: '% of impression occurance',
    data: [19, 17, 12, 11, 7]
  }],
  colors: ['#382AFA'],
  chart: {
    type: 'bar',
    height: 350
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: true
    }
  },
  dataLabels: {
    enabled: false
  },
  grid: {
    show: false,
  },
  xaxis: {
    categories: ['Flight Delays and Cancellations', 'Customer service experience', 'Baggage Issues', 'In-Flight Experience', 'Hidden Fees and Extra Charges'],
    axisBorder: {
      show: false,
    },
    labels: {
      style: {
        colors: ['#0B037D'],
        fontSize: '14px',
        fontFamily: 'Onest, sans-serif',
      },
      formatter: function (value) {
        return value + '%';
      },
    },
  },
  yaxis: {
    labels: {
      maxWidth: 300,
      style: {
        colors: ['#0B037D'],
        fontSize: '16px',
        fontWeight: '500',
        fontFamily: 'Onest, sans-serif',
      },
    }
  }
};

var chart7 = new ApexCharts(document.querySelector("#chart7"), options7);
chart7.render();



// Airlines vs. Global Disruptions by Regions

var options1 = {
  series: [{
    data: [12.7, 39.4, 27.1, 13.7, 7.2],
    name: '% of Airlines',
  }, {
    data: [27.6, 42.6, 17.3, 7.2, 5.3],
    name: '% of Global Disruption'
  }],
  colors: ['#382AFA', '#ACA6FC'],
  chart: {
    type: 'bar',
    height: 430
  },
  plotOptions: {
    bar: {
      horizontal: true,
      dataLabels: {
        position: 'top',
      },
    }
  },
  dataLabels: {
    enabled: true,
    offsetX: -6,
    style: {
      fontSize: '14px',
    },
    formatter: function (value) {
      return value + '%';
    }
  },
  stroke: {
    show: true,
    width: 1,
    colors: ['#fff']
  },
  tooltip: {
    shared: true,
    intersect: false
  },
  xaxis: {
    categories: ['North America', 'APAC', 'Europe', 'ME&A', 'LATAM'],
  },
};

var chart1 = new ApexCharts(document.querySelector("#chart1"), options1);
chart1.render();




// Airlines vs. Global Disruptions by Tiers


var options9 = {
  series: [{
    data: [14.7, 23.6, 29.8, 31.8],
    name: '% of Airlines',
  }, {
    data: [41.1, 26.8, 16.5, 9.5],
    name: '% of Global Disruption'
  }],
  colors: ['#382AFA', '#ACA6FC'],
  chart: {
    type: 'bar',
    height: 430
  },
  plotOptions: {
    bar: {
      horizontal: true,
      dataLabels: {
        position: 'top',
      },
    }
  },
  dataLabels: {
    enabled: true,
    offsetX: -6,
    style: {
      fontSize: '14px',
    },
    formatter: function (value) {
      return value + '%';
    }
  },
  stroke: {
    show: true,
    width: 1,
    colors: ['#fff']
  },
  tooltip: {
    shared: true,
    intersect: false
  },
  xaxis: {
    categories: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'],
  },
};

var chart9 = new ApexCharts(document.querySelector("#chart9"), options9);
chart9.render();


//Average ImPax vs. Total Disruption | Regional

var options22 = {
  series: [{
    name: 'Avg. ImPax %',
    data: [12, 6.3, 3.6, 5.3, 4.9]
  }, {
    name: 'Avg. % Total Disruption',
    data: [26.6, 23.4, 15.7, 20.9, 16.1]
  }],
  colors: ['#382AFA', '#ACA6FC'],
  chart: {
    type: 'bar',
    height: 430,
    toolbar: {
      show: false
    },
    zoom: {
      enabled: true
    }
  },
  responsive: [{
    breakpoint: 480,
    options: {
      legend: {
        position: 'bottom',
        offsetX: -10,
        offsetY: 0
      }
    }
  }],
  plotOptions: {
    bar: {
      horizontal: false,
      dataLabels: {
        total: {
          enabled: false,
          style: {
            fontSize: '13px',
            fontWeight: 900
          }
        }
      }
    },
  },
  xaxis: {
    categories: ['North America', 'APAC', 'Europe', 'ME&A', 'LATAM'],
  },
  legend: {
    position: 'bottom',
    offsetY: 10
  },
  fill: {
    opacity: 1
  }
};

var chart22 = new ApexCharts(document.querySelector("#chart22"), options22);
chart22.render();

//Average ImPax vs. Total Disruption | By Tiers

var options23 = {
  series: [{
    name: 'Avg. ImPax %',
    data: [5, 6.2, 6.5, 6]
  }, {
    name: 'Avg. % Total Disruption',
    data: [19, 20.1, 22.6, 20.3]
  }],
  colors: ['#382AFA', '#ACA6FC'],
  chart: {
    type: 'bar',
    height: 430,
    toolbar: {
      show: false
    },
    zoom: {
      enabled: true
    }
  },
  responsive: [{
    breakpoint: 480,
    options: {
      legend: {
        position: 'bottom',
        offsetX: -10,
        offsetY: 0
      }
    }
  }],
  plotOptions: {
    bar: {
      horizontal: false,
      dataLabels: {
        total: {
          enabled: false,
          style: {
            fontSize: '13px',
            fontWeight: 900
          }
        }
      }
    },
  },
  xaxis: {
    categories: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'],
  },
  legend: {
    position: 'bottom',
    offsetY: 10
  },
  fill: {
    opacity: 1
  }
};

var chart23 = new ApexCharts(document.querySelector("#chart23"), options23);
chart23.render();