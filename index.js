// Navigate to Login Screen
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('LoginBox').addEventListener('click', function() {
        window.location.href = '/LoginScreen.html';
    });
});
// Navigate to Landing Screen
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('DL_ICON').addEventListener('click', function() {
        window.location.href = '/index.html';
    });
});
// Navigate to How To Play Screen
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('LtoP').addEventListener('click', function() {
        window.location.href = '/HowToPlay.html';
    });
});
//Navigate to Gallery
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('gallery').addEventListener('click', function() {
        window.location.href = '/Gallery.html';
    });
});

// Gallery Fucntion
fetch('/DLCardMetadata.csv')
.then(response => response.text())
.then(csv => {
    Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            var tableBody = document.getElementById('cardsTable').getElementsByTagName('tbody')[0];
            results.data.forEach(function(row) {
                var tr = document.createElement('tr');
                
                var imgTd = document.createElement('td');
                var img = document.createElement('img');
                img.src = row['Internal ID (String)'];
                imgTd.appendChild(img);
                tr.appendChild(imgTd);
                
                tr.appendChild(createCell(row['Card Name (string)']));
                tr.appendChild(createCell(row['Type (String)']));
                tr.appendChild(createCell(row['Faction (String)']));

                var mightMindCell = createCell('');
                //mightMindCell.className = 'might-mind-cell';
                var mightMindValue = document.createTextNode(row['Value (Int)'] + ' ');
                mightMindCell.appendChild(mightMindValue);
                if (row['Might (Boolean)'] === '1') {
                    var mightIcon = document.createElement('img');
                    mightIcon.src = '/images/OtherAssets/mighticon.png';
                    mightIcon.className = 'might-mind-icon';
                    mightMindCell.appendChild(mightIcon);
                } else if (row['Mind (Boolean)'] === '1') {
                    var mindIcon = document.createElement('img');
                    mindIcon.src = '/images/OtherAssets/mindicon.png';
                    mindIcon.className = 'might-mind-icon';
                    mightMindCell.appendChild(mindIcon);
                }
                tr.appendChild(mightMindCell);

                var effectText = row['Effect (string)'];
                    if (row['Ability (Boolean)'] === '1') {
                        // Remove quotes from effectText if Ability is '0'
                        effectText = effectText.replace(/"/g, '');
                    }

                tr.appendChild(createCell(effectText));

                tableBody.appendChild(tr);
            });

            function createCell(text) {
                var td = document.createElement('td');
                td.textContent = text;
                return td;
            }
        }
    });
});