
// APAC Impressions

var options3 = {
    series: [{
      name: '% of impression occurance',
      data: [32, 25, 12, 7, 5]
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
      categories: ['Flight Delay/Cancellation', 'Staff Behavior', 'Customer Service', 'Seat Comfort', 'In-Flight Entertainment'],
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
      data: [30, 16, 11, 9, 9]
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
      categories: ['Cancellation and Delays', 'Staff Behaviour', 'Customer Service', 'Luggage Handling', 'Pricing and Fees'],
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
      data: [27, 21, 17, 5, 5]
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
      categories: ['Staff Professionalism/Attitude', 'Customer Service Experience', 'Flight Delay and Cancellation', 'Seat Comfort and Legroom', 'Booking Process'],
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
      data: [19, 18, 12, 12, 10]
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
      categories: ['Customer Service', 'Flight Delay', 'Cabin Crew', 'Flight Experience', 'Luggage Issue'],
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
      data: [25, 16, 11, 10, 8]
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
      categories: ['Customer Service', 'In-Flight Service', 'Booking and Reservation', 'Crew Service', 'Flight Cancellation'],
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
    data: [12.4, 40, 26.6, 13.4, 7.6],
    name: '% of Airlines',
  }, {
    data: [20.2, 49.1, 18.1, 7.5, 5.1],
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
    data: [13.8, 26.2, 29, 31],
    name: '% of Airlines',
  }, {
    data: [49.8, 27.5, 13.7, 9],
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
    data: [7.2, 8, 3.8, 5, 5.1]
  }, {
    name: 'Avg. % Total Disruption',
    data: [20.5, 26.7, 17.3, 21.9, 16.7]
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
    data: [6.1, 5.5, 6.3, 6.7]
  }, {
    name: 'Avg. % Total Disruption',
    data: [21.9, 21, 22.5, 22.6]
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
