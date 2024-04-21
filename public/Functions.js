function checkPassword(isLocked, id) 
{
    console.log(isLocked);
    if (isLocked == 1) 
    {
        console.log('Please enter password for lobby.');
        var popupWindow = document.getElementById("popup-window");
        document.getElementById("lobbyId").value=id;
        popupWindow.style.display = "inline-flex";
    }

    else 
    {
        console.log('Lobby is unlocked. No password required.');

        fetch ("/join-lobby/" + id,
        {
            method:"POST"
        }) 
        .then(response => 
        {
           window.location = response.url;
        })
        .then(data => 
        {
        })
        .catch(error => console.error('Error:', error));
    };
}
